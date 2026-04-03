import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from models import Sale
from routes.auth import get_current_user, User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/forecast")
def get_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        results = (
            db.query(
                extract("year", Sale.sale_time).label("year"),
                extract("month", Sale.sale_time).label("month"),
                func.sum(Sale.total_amount).label("revenue"),
                func.count(Sale.sale_id).label("transactions"),
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )

        if len(results) < 2:
            now = datetime.utcnow()
            fallback = []
            for i in range(6):
                d = now - timedelta(days=(5 - i) * 30)
                fallback.append({
                    "period": f"{d.year}-{d.month:02d}",
                    "revenue": 0,
                    "predicted": False,
                    "transactions": 0,
                })
            return {
                "message": "Insufficient data for forecast. Add more sales records.",
                "data": fallback,
            }

        months_labels = [f"{int(r.year)}-{int(r.month):02d}" for r in results]
        revenues = [float(r.revenue) for r in results]

        try:
            from sklearn.linear_model import LinearRegression
            import numpy as np

            X = np.array(range(len(revenues))).reshape(-1, 1)
            y = np.array(revenues)
            model = LinearRegression()
            model.fit(X, y)

            n = len(revenues)
            future_months = []
            last_year = int(results[-1].year)
            last_month = int(results[-1].month)
            for i in range(1, 5):
                m = last_month + i
                y_offset = (m - 1) // 12
                m = ((m - 1) % 12) + 1
                future_months.append(f"{last_year + y_offset}-{m:02d}")

            predicted_values = model.predict(np.array(range(n, n + 4)).reshape(-1, 1))
            predicted_values = [max(0.0, float(v)) for v in predicted_values]
        except ImportError:
            n = len(revenues)
            if n >= 2:
                slope = (revenues[-1] - revenues[-2])
            else:
                slope = 0
            predicted_values = [max(0.0, revenues[-1] + slope * (i + 1)) for i in range(4)]
            last_year = int(results[-1].year)
            last_month = int(results[-1].month)
            future_months = []
            for i in range(1, 5):
                m = last_month + i
                y_offset = (m - 1) // 12
                m = ((m - 1) % 12) + 1
                future_months.append(f"{last_year + y_offset}-{m:02d}")

        historical = [
            {
                "period": months_labels[i],
                "revenue": revenues[i],
                "transactions": int(results[i].transactions),
                "predicted": False,
            }
            for i in range(len(revenues))
        ]
        forecast = [
            {
                "period": future_months[i],
                "revenue": round(predicted_values[i], 2),
                "transactions": None,
                "predicted": True,
            }
            for i in range(4)
        ]

        return {"data": historical + forecast, "message": "Forecast generated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


@router.get("/peak-hours")
def get_peak_hours(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(Sale.hour_of_day, func.count(Sale.sale_id), func.sum(Sale.total_amount))
        .group_by(Sale.hour_of_day)
        .order_by(Sale.hour_of_day)
        .all()
    )
    hour_map = {row[0]: {"count": row[1], "revenue": float(row[2] or 0)} for row in results}
    return [
        {
            "hour": h,
            "label": f"{h:02d}:00",
            "count": hour_map.get(h, {}).get("count", 0),
            "revenue": hour_map.get(h, {}).get("revenue", 0.0),
        }
        for h in range(24)
    ]


@router.get("/day-trends")
def get_day_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    results = (
        db.query(Sale.day_of_week, func.count(Sale.sale_id), func.sum(Sale.total_amount))
        .group_by(Sale.day_of_week)
        .all()
    )
    data_map = {row[0]: {"count": row[1], "revenue": float(row[2] or 0)} for row in results}
    return [
        {
            "day": day,
            "count": data_map.get(day, {}).get("count", 0),
            "revenue": data_map.get(day, {}).get("revenue", 0.0),
        }
        for day in days_order
    ]


class EOQRequest(BaseModel):
    annual_demand: float
    ordering_cost: float = 50.0
    holding_cost: float
    lead_time: float = 7.0
    daily_sales: float
    safety_stock: float = 0.0


@router.post("/eoq-rop")
def calculate_eoq_rop(req: EOQRequest, current_user: User = Depends(get_current_user)):
    if req.holding_cost <= 0:
        raise HTTPException(status_code=400, detail="Holding cost must be greater than 0")
    if req.annual_demand <= 0:
        raise HTTPException(status_code=400, detail="Annual demand must be greater than 0")

    eoq = math.sqrt((2 * req.annual_demand * req.ordering_cost) / req.holding_cost)
    rop = (req.lead_time * req.daily_sales) + req.safety_stock
    orders_per_year = req.annual_demand / eoq
    cycle_time_days = 365 / orders_per_year

    return {
        "eoq": round(eoq, 2),
        "rop": round(rop, 2),
        "orders_per_year": round(orders_per_year, 2),
        "cycle_time_days": round(cycle_time_days, 2),
        "total_annual_cost": round(
            (req.annual_demand / eoq) * req.ordering_cost + (eoq / 2) * req.holding_cost, 2
        ),
        "interpretation": (
            f"Order {round(eoq)} units each time. "
            f"Place a new order when stock reaches {round(rop)} units. "
            f"You'll order approximately {round(orders_per_year)} times per year, "
            f"every {round(cycle_time_days)} days."
        ),
    }
