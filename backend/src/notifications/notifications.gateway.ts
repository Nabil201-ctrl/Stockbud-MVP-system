import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationsGateway {
    @WebSocketServer()
    server: Server;

    sendNotificationToUser(userId: string, notification: any) {
        this.server.to(userId).emit('notification', notification);
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        client.join(userId);
        console.log(`User ${userId} joined notification room`);
    }
}
