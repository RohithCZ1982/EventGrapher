
from fastapi import APIRouter
router = APIRouter()

@router.post("/enqueue")
def enqueue_task():
    return {"message": "enqueue Cloud Task here"}
