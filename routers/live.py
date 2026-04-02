from fastapi import APIRouter, WebSocket

router = APIRouter()

clients = []

@router.websocket("/live")
async def live_dashboard(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    try:
        while True:
            data = {
                "message": "live update"
            }
            await websocket.send_json(data)
    except:
        clients.remove(websocket)