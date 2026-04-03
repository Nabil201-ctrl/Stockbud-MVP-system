import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload, ClientProxy } from '@nestjs/microservices';

@Controller()
export class ImageMicroserviceController {
    constructor(
        @Inject('IMAGE_SERVICE') private readonly client: ClientProxy,
    ) { }

    @EventPattern('IMAGE_UPLOAD_DONE')
    async handleImageUpload(@Payload() data: any) {
        console.log('[Main Server] Reacting to Cloudinary upload via RabbitMQ:', data.urls.length, 'images.');

        // Demonstrate bidirectional communication:
        // Main server sends a "POST-PROCESS" request back to the microservice
        this.client.emit('PROCESS_IMAGE_ASYNC', {
            urls: data.urls,
            action: 'RESIZE_AND_WATERMARK'
        });
    }
}
