import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { SocialStoresService } from './social-stores.service';
import { SocialStore } from '../database/interfaces';
import { AuthGuard } from '@nestjs/passport';

@Controller('social-stores')
export class SocialStoresController {
    constructor(private readonly socialStoresService: SocialStoresService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(@Req() req) {
        return this.socialStoresService.findAll(req.user.id);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Req() req, @Body() data: Partial<SocialStore>) {
        return this.socialStoresService.create(req.user.id, data);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.socialStoresService.findById(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(@Param('id') id: string, @Body() data: Partial<SocialStore>) {
        return this.socialStoresService.update(id, data);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async delete(@Param('id') id: string) {
        return this.socialStoresService.delete(id);
    }

    @Post(':id/record-visit')
    async recordVisit(@Param('id') id: string) {
        return this.socialStoresService.recordVisit(id);
    }

    @Post(':id/record-inquiry')
    async recordInquiry(@Param('id') id: string) {
        return this.socialStoresService.recordInquiry(id);
    }

    @Get(':id/stats')
    @UseGuards(AuthGuard('jwt'))
    async getStats(@Param('id') id: string) {
        return this.socialStoresService.getStats(id);
    }

    @Get(':id/products')
    async getStoreProducts(@Param('id') id: string) {
        return this.socialStoresService.getProducts(id);
    }

    @Post(':id/products')
    @UseGuards(AuthGuard('jwt'))
    async addProduct(@Param('id') id: string, @Body() product: any) {
        return this.socialStoresService.addProduct(id, product);
    }

    @Patch(':id/products/:productId')
    @UseGuards(AuthGuard('jwt'))
    async editProduct(@Param('id') id: string, @Param('productId') productId: string, @Body() data: any) {
        return this.socialStoresService.editProduct(id, productId, data);
    }

    @Delete(':id/products/:productId')
    @UseGuards(AuthGuard('jwt'))
    async deleteProduct(@Param('id') id: string, @Param('productId') productId: string) {
        return this.socialStoresService.deleteProduct(id, productId);
    }
}
