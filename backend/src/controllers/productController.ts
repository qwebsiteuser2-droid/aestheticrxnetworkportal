import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Product } from '../models/Product';
import { getBackendUrl } from '../config/urlConfig';

/**
 * Get all products (public)
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const productRepository = AppDataSource.getRepository(Product);
    
    const { page = 1, limit = 100, category, featured, visible } = req.query;
    
    const queryBuilder = productRepository.createQueryBuilder('product');
    
    // Apply filters
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }
    
    if (featured === 'true') {
      queryBuilder.andWhere('product.is_featured = :featured', { featured: true });
    }
    
    if (visible === 'true') {
      queryBuilder.andWhere('product.is_visible = :visible', { visible: true });
    }
    
    // Order by slot index
    queryBuilder.orderBy('product.slot_index', 'ASC');
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    
    const [products, total] = await queryBuilder.getManyAndCount();
    
    // Transform relative image URLs to full URLs
    const backendUrl = getBackendUrl();
    console.log('🔧 getProducts - Backend URL:', backendUrl);
    const transformedProducts = products.map(product => {
      const productData = product.toPublicJSON();
      if (productData.image_url && !productData.image_url.startsWith('http://') && !productData.image_url.startsWith('https://')) {
        // Remove leading slash if present
        const imagePath = productData.image_url.startsWith('/')
          ? productData.image_url.substring(1)
          : productData.image_url;
        const fullImageUrl = `${backendUrl}/api/images/${imagePath}`;
        console.log(`🖼️ Transforming image: ${productData.image_url} → ${fullImageUrl}`);
        productData.image_url = fullImageUrl;
      }
      return productData;
    });
    
    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: unknown) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id } });
    
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }
    
    // Transform relative image URL to full URL
    const backendUrl = getBackendUrl();
    const productData = product.toPublicJSON();
    if (productData.image_url && !productData.image_url.startsWith('http://') && !productData.image_url.startsWith('https://')) {
      const imagePath = productData.image_url.startsWith('/')
        ? productData.image_url.substring(1)
        : productData.image_url;
      productData.image_url = `${backendUrl}/api/images/${imagePath}`;
    }
    
    res.json({
      success: true,
      data: {
        product: productData
      }
    });
  } catch (error: unknown) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

/**
 * Get product by slot index
 */
export const getProductBySlot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slot } = req.params;
    const slotIndex = slot ? parseInt(slot) : 0;
    
    if (isNaN(slotIndex) || slotIndex < 1 || slotIndex > 100) {
      res.status(400).json({
        success: false,
        message: 'Invalid slot index. Must be between 1 and 100'
      });
      return;
    }
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { slot_index: slotIndex } });
    
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found for this slot'
      });
      return;
    }
    
    // Transform relative image URL to full URL
    const backendUrl = getBackendUrl();
    const productData = product.toPublicJSON();
    if (productData.image_url && !productData.image_url.startsWith('http://') && !productData.image_url.startsWith('https://')) {
      const imagePath = productData.image_url.startsWith('/')
        ? productData.image_url.substring(1)
        : productData.image_url;
      productData.image_url = `${backendUrl}/api/images/${imagePath}`;
    }
    
    res.json({
      success: true,
      data: {
        product: productData
      }
    });
  } catch (error: unknown) {
    console.error('Get product by slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

/**
 * Get product categories
 */
export const getProductCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const productRepository = AppDataSource.getRepository(Product);
    
    const categories = await productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.category IS NOT NULL')
      .andWhere('product.is_visible = :visible', { visible: true })
      .getRawMany();
    
    res.json({
      success: true,
      data: {
        categories: categories.map(cat => cat.category).filter(Boolean)
      }
    });
  } catch (error: unknown) {
    console.error('Get product categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

/**
 * Search products
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
      return;
    }
    
    const productRepository = AppDataSource.getRepository(Product);
    const queryBuilder = productRepository.createQueryBuilder('product');
    
    // Search in name and description
    queryBuilder.where(
      '(LOWER(product.name) LIKE LOWER(:query) OR LOWER(product.description) LIKE LOWER(:query))',
      { query: `%${q}%` }
    );
    
    // Only visible products
    queryBuilder.andWhere('product.is_visible = :visible', { visible: true });
    
    // Order by relevance (name matches first)
    queryBuilder.orderBy(
      'CASE WHEN LOWER(product.name) LIKE LOWER(:query) THEN 1 ELSE 2 END',
      'ASC'
    );
    queryBuilder.addOrderBy('product.slot_index', 'ASC');
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    
    const [products, total] = await queryBuilder.getManyAndCount();
    
    // Transform relative image URLs to full URLs
    const backendUrl = getBackendUrl();
    const transformedProducts = products.map(product => {
      const productData = product.toPublicJSON();
      if (productData.image_url && !productData.image_url.startsWith('http://') && !productData.image_url.startsWith('https://')) {
        const imagePath = productData.image_url.startsWith('/')
          ? productData.image_url.substring(1)
          : productData.image_url;
        productData.image_url = `${backendUrl}/api/images/${imagePath}`;
      }
      return productData;
    });
    
    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        query: q
      }
    });
  } catch (error: unknown) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
};
