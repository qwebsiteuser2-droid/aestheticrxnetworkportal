import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Product } from '../models/Product';
import { ProductReview } from '../models/ProductReview';
import { AuthenticatedRequest } from '../middleware/auth';

export const listProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const reviewRepository = AppDataSource.getRepository(ProductReview);
    const reviews = await reviewRepository.find({
      where: { product_id: productId },
      order: { created_at: 'DESC' },
      take: 50,
    });

    const avg =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.json({
      success: true,
      data: {
        reviews: reviews.map((r) => r.toJSON()),
        average_rating: Math.round(avg * 10) / 10,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error('List product reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

export const createProductReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const user = req.user!;
    const { rating, comment } = req.body;

    const parsedRating = Math.min(5, Math.max(1, parseInt(String(rating), 10) || 5));
    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';

    if (!trimmedComment || trimmedComment.length < 3) {
      res.status(400).json({
        success: false,
        message: 'Please enter a comment of at least 3 characters',
      });
      return;
    }

    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const authorName =
      user.doctor_name ||
      user.clinic_name ||
      user.email?.split('@')[0] ||
      'Customer';

    const reviewRepository = AppDataSource.getRepository(ProductReview);
    const review = reviewRepository.create({
      product_id: productId,
      user_id: user.id,
      author_name: authorName,
      rating: parsedRating,
      comment: trimmedComment,
    });
    const saved = await reviewRepository.save(review);

    res.status(201).json({
      success: true,
      message: 'Review submitted',
      data: { review: saved.toJSON() },
    });
  } catch (error) {
    console.error('Create product review error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};
