import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'shopify',
})
export class ShopifyGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        console.log('Shopify Socket Gateway Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join-room')
    handleJoinRoom(@MessageBody() data: { shop: string }, @ConnectedSocket() client: Socket) {
        if (data.shop) {
            client.join(data.shop);
            console.log(`Client ${client.id} joined room: ${data.shop}`);
            return { event: 'joined', room: data.shop };
        }
    }

    // Method to emit status updates to a specific shop room
    emitStatusUpdate(shop: string, step: number, status: string) {
        this.server.to(shop).emit('statusUpdate', { step, status });
        console.log(`Emitted status update for ${shop}: Step ${step} - ${status}`);
    }
}
