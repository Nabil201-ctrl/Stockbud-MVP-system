import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chats')
@UseGuards(AuthGuard('jwt'))

export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get()
    getUserChats(@Req() req) {
        return this.chatService.getUserChats(req.user.id);
    }

    @Get(':id')
    getChat(@Req() req, @Param('id') id: string) {
        return this.chatService.getChat(req.user.id, id);
    }

    @Post('quick')
    quickChat(@Req() req, @Body() body: { content: string, history: { role: 'user' | 'assistant', content: string }[], language?: string }) {
        return this.chatService.quickChat(req.user.id, body.content, body.history, body.language);
    }

    @Post()
    createChat(@Req() req, @Body() body: { title?: string, firstMessage?: string, language?: string }) {
        return this.chatService.createChat(req.user.id, body.title, body.firstMessage, body.language);
    }

    @Post(':id/messages')
    sendMessage(@Req() req, @Param('id') id: string, @Body() body: { content: string, language?: string }) {
        return this.chatService.addMessage(req.user.id, id, body.content, body.language);
    }

    @Delete(':id')
    deleteChat(@Req() req, @Param('id') id: string) {
        return this.chatService.deleteChat(req.user.id, id);
    }
}
