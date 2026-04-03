import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

from config import settings
from routes.auth import get_current_user, User

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SmartStock AI, an intelligent inventory management assistant embedded in SmartStock Pro.
You help inventory managers with:
- EOQ (Economic Order Quantity) calculations: EOQ = sqrt(2DS/H) where D=annual demand, S=ordering cost, H=holding cost
- Reorder Point (ROP) calculations: ROP = (lead_time_days × daily_sales_velocity) + safety_stock
- Demand forecasting and trend analysis
- Stock alert interpretation (critical = below 25% of reorder level, low = below reorder level, overstock = above 120% of optimal stock)
- Inventory optimization strategies
- Purchase order planning

Be concise, practical, and use numbers when helpful. Format responses clearly."""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


@router.post("/message")
async def chat_message(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        return {
            "response": local_fallback(req.message),
            "source": "local",
        }

    try:
        messages = []
        for h in (req.history or []):
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": req.message})

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
                    "max_tokens": 512,
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
            return {"response": ai_response, "source": "groq"}

    except httpx.HTTPStatusError as e:
        logger.error(f"Groq API HTTP error: {e}")
        return {"response": local_fallback(req.message), "source": "local"}
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return {"response": local_fallback(req.message), "source": "local"}


def local_fallback(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["eoq", "economic order"]):
        return (
            "**EOQ Formula:** √(2DS/H)\n\n"
            "- **D** = Annual demand (units)\n"
            "- **S** = Ordering cost per order\n"
            "- **H** = Annual holding cost per unit\n\n"
            "Example: D=1000, S=$50, H=$10 → EOQ = √(2×1000×50/10) = **100 units**"
        )
    elif any(w in msg for w in ["rop", "reorder point", "reorder"]):
        return (
            "**Reorder Point (ROP):** (Lead Time × Daily Sales) + Safety Stock\n\n"
            "Example: Lead time = 7 days, Daily sales = 20 units, Safety stock = 50\n"
            "ROP = (7 × 20) + 50 = **190 units**\n\n"
            "Place a new order when your stock hits the ROP level."
        )
    elif any(w in msg for w in ["low stock", "critical", "alert"]):
        return (
            "**Stock Alert Levels:**\n\n"
            "🔴 **Critical**: Stock < 25% of reorder level → Order immediately\n"
            "🟡 **Low**: Stock < reorder level → Plan purchase order\n"
            "🟢 **Optimal**: Stock between reorder and 120% of optimal stock\n"
            "🟠 **Overstock**: Stock > 120% of optimal → Pause ordering, consider promotions"
        )
    elif any(w in msg for w in ["forecast", "predict", "trend"]):
        return (
            "**Demand Forecasting Tips:**\n\n"
            "1. Check the Analytics page for your sales trend chart\n"
            "2. Use linear regression forecast for 4-month projections\n"
            "3. Day-of-week trends reveal your busiest sales days\n"
            "4. Peak hour analysis helps with staffing and stock readiness\n\n"
            "Navigate to **Analytics** → Demand Forecast for your data."
        )
    elif any(w in msg for w in ["help", "what can you", "what do you"]):
        return (
            "I'm **SmartStock AI** — here to help with:\n\n"
            "📦 **EOQ calculations** — optimal order quantities\n"
            "🎯 **Reorder points** — when to place orders\n"
            "📈 **Demand forecasting** — predict future sales\n"
            "⚠️ **Stock alerts** — interpret critical/low/overstock levels\n"
            "💰 **Cost optimization** — reduce carrying and ordering costs\n\n"
            "Try asking: *'Calculate EOQ for 500 units demand'* or *'What is reorder point?'*"
        )
    else:
        return (
            "I'm SmartStock AI. I can help with:\n\n"
            "• **EOQ calculations** — type 'calculate EOQ'\n"
            "• **Reorder points** — type 'what is ROP'\n"
            "• **Stock alerts** — type 'explain alerts'\n"
            "• **Forecasting** — type 'sales trends'\n\n"
            "*(Note: Groq AI API is not configured. Using built-in responses.)*"
        )
