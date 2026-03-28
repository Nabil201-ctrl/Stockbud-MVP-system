export interface OrderItem {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: string;
    storeId: string;
    items: OrderItem[];
    totalAmount: number;
    currency: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: string;
}

export interface OrderMicroserviceMessage {
    order: Partial<Order>;
    action: 'CREATE_ORDER';
}
