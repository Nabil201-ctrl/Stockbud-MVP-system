import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class ImageMicroserviceController {
    @EventPattern('IMAGE_UPLOAD_DONE')
    async handleImageUpload(@Payload() data: any) {
        console.log('🖼️ [ImageMicroservice Sync] Incoming image uploaded event from microservice:', data.urls.length, 'images.');
        // This is where the platform would react to the upload, for example, logging or triggering image resizing/moderation.
        // Currently, it just acknowledges the event via the RabbitMQ connection.
    }
}
