import { Request, Response } from 'express';
import gmailService from '../services/gmailService';
import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';

export const sendManualOrderNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber, paymentMethod = 'payfast_online' } = req.body;

    if (!orderNumber) {
      res.status(400).json({ success: false, message: 'Order number is required' });
      return;
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { order_number: orderNumber },
      relations: ['doctor', 'product']
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    await gmailService.sendOrderPlacedAlert(order, paymentMethod);

    res.json({
      success: true,
      message: `Manual order notification sent for order ${orderNumber} (${paymentMethod})`
    });

  } catch (error: unknown) {
    console.error('❌ Manual order notification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send manual order notification',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

export const sendManualPaymentConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber, transactionId, amount, paymentMethod = 'payfast_online' } = req.body;

    if (!orderNumber || !transactionId || !amount) {
      res.status(400).json({ success: false, message: 'Order number, transaction ID, and amount are required' });
      return;
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { order_number: orderNumber },
      relations: ['doctor', 'product']
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Update order status to paid
    order.payment_status = 'paid';
    order.payment_transaction_id = transactionId;
    order.payment_amount = amount;
    order.payment_completed_at = new Date();
    await orderRepository.save(order);

    await gmailService.sendOrderPlacedAlert(order, paymentMethod);

    res.json({
      success: true,
      message: `Manual payment confirmation sent for order ${orderNumber} (Transaction ID: ${transactionId})`
    });

  } catch (error: unknown) {
    console.error('❌ Manual payment confirmation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send manual payment confirmation',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};
