import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { FeaturedItem } from '../models/FeaturedItem';
import { Product } from '../models/Product';
import { Doctor, UserType } from '../models/Doctor';

/**
 * Get featured products for landing page (public)
 * GET /api/public/featured/products
 */
export const getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const productRepository = AppDataSource.getRepository(Product);

    // Try to get featured items (table may not exist yet)
    let featuredItems: FeaturedItem[] = [];
    try {
      const featuredItemRepository = AppDataSource.getRepository(FeaturedItem);
      featuredItems = await featuredItemRepository.find({
        where: { item_type: 'product', is_active: true },
        order: { display_order: 'ASC' },
        take: 4,
      });
    } catch (err) {
      // Table doesn't exist yet - will use fallback
    }

    if (featuredItems.length > 0) {
      // Get actual product data
      const productIds = featuredItems.map(f => f.item_id);
      const products = await productRepository
        .createQueryBuilder('product')
        .select([
          'product.id',
          'product.name',
          'product.price',
          'product.image_url',
          'product.is_visible',
          'product.stock_quantity',
        ])
        .where('product.id IN (:...ids)', { ids: productIds })
        .andWhere('product.is_visible = true')
        .getMany();

      // Sort by featured order
      const sortedProducts = featuredItems
        .map(f => products.find(p => p.id === f.item_id))
        .filter(p => p !== undefined);

      res.json({
        success: true,
        data: { products: sortedProducts },
      });
    } else {
      // Fallback: Get first 4 visible products
      const products = await productRepository
        .createQueryBuilder('product')
        .select([
          'product.id',
          'product.name',
          'product.price',
          'product.image_url',
          'product.is_visible',
          'product.stock_quantity',
        ])
        .where('product.is_visible = true')
        .orderBy('product.is_featured', 'DESC')
        .take(4)
        .getMany();

      res.json({
        success: true,
        data: { products },
      });
    }
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products',
    });
  }
};

/**
 * Get featured doctors for landing page (public)
 * GET /api/public/featured/doctors
 */
export const getFeaturedDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Try to get featured items (table may not exist yet)
    let featuredItems: FeaturedItem[] = [];
    try {
      const featuredItemRepository = AppDataSource.getRepository(FeaturedItem);
      featuredItems = await featuredItemRepository.find({
        where: { item_type: 'doctor', is_active: true },
        order: { display_order: 'ASC' },
        take: 4,
      });
    } catch (err) {
      // Table doesn't exist yet - will use fallback
    }

    if (featuredItems.length > 0) {
      // Get actual doctor data
      const doctorIds = featuredItems.map(f => f.item_id);
      const doctors = await doctorRepository
        .createQueryBuilder('doctor')
        .select([
          'doctor.id',
          'doctor.doctor_name',
          'doctor.clinic_name',
          'doctor.profile_photo_url',
          'doctor.bio',
          'doctor.tags',
          'doctor.is_online',
          'doctor.availability_status',
          'doctor.last_active_at',
        ])
        .where('doctor.id IN (:...ids)', { ids: doctorIds })
        .andWhere('doctor.user_type = :userType', { userType: UserType.DOCTOR })
        .andWhere('doctor.is_approved = true')
        .andWhere('doctor.is_deactivated = false')
        .andWhere('doctor.is_admin = false')
        .getMany();

      // Sort by featured order
      const sortedDoctors = featuredItems
        .map(f => doctors.find(d => d.id === f.item_id))
        .filter(d => d !== undefined)
        .map(d => ({
          id: d!.id,
          doctor_name: d!.doctor_name,
          clinic_name: d!.clinic_name,
          profile_photo_url: d!.profile_photo_url,
          bio: d!.bio,
          tags: d!.tags || [],
          is_online: d!.is_online ?? false,
          availability_status: d!.availability_status || 'available',
          last_active_at: d!.last_active_at,
        }));

      res.json({
        success: true,
        data: { doctors: sortedDoctors },
      });
    } else {
      // Fallback: Get first 4 approved doctors
      const doctors = await doctorRepository
        .createQueryBuilder('doctor')
        .select([
          'doctor.id',
          'doctor.doctor_name',
          'doctor.clinic_name',
          'doctor.profile_photo_url',
          'doctor.bio',
          'doctor.tags',
          'doctor.is_online',
          'doctor.availability_status',
          'doctor.last_active_at',
        ])
        .where('doctor.user_type = :userType', { userType: UserType.DOCTOR })
        .andWhere('doctor.is_approved = true')
        .andWhere('doctor.is_deactivated = false')
        .andWhere('doctor.is_admin = false')
        .orderBy('doctor.created_at', 'DESC')
        .take(4)
        .getMany();

      res.json({
        success: true,
        data: {
          doctors: doctors.map(d => ({
            id: d.id,
            doctor_name: d.doctor_name,
            clinic_name: d.clinic_name,
            profile_photo_url: d.profile_photo_url,
            bio: d.bio,
            tags: d.tags || [],
            is_online: d.is_online ?? false,
            availability_status: d.availability_status || 'available',
            last_active_at: d.last_active_at,
          })),
        },
      });
    }
  } catch (error) {
    console.error('Error fetching featured doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured doctors',
    });
  }
};

/**
 * Get all featured items for admin
 * GET /api/admin/featured
 */
export const getAdminFeaturedItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const productRepository = AppDataSource.getRepository(Product);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if featured_items table exists
    let featuredProducts: any[] = [];
    let featuredDoctors: any[] = [];
    
    try {
      // Check if table exists first
      const tableCheck = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'featured_items'
        )
      `);
      
      const tableExists = tableCheck[0]?.exists;
      
      if (tableExists) {
        const featuredItemRepository = AppDataSource.getRepository(FeaturedItem);
        featuredProducts = await featuredItemRepository.find({
          where: { item_type: 'product' },
          order: { display_order: 'ASC' },
        });

        featuredDoctors = await featuredItemRepository.find({
          where: { item_type: 'doctor' },
          order: { display_order: 'ASC' },
        });
      }
    } catch (err) {
      // featured_items table may not exist yet - that's okay
      console.log('Featured items table not ready, returning empty featured lists');
    }

    // Get all available products
    const allProducts = await productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.price',
        'product.image_url',
        'product.is_visible',
      ])
      .where('product.is_visible = true')
      .orderBy('product.name', 'ASC')
      .getMany();

    // Get all available doctors
    const allDoctors = await doctorRepository
      .createQueryBuilder('doctor')
      .select([
        'doctor.id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.profile_photo_url',
      ])
      .where('doctor.user_type = :userType', { userType: UserType.DOCTOR })
      .andWhere('doctor.is_approved = true')
      .andWhere('doctor.is_deactivated = false')
      .orderBy('doctor.doctor_name', 'ASC')
      .getMany();

    // Enrich featured items with actual data
    const enrichedProducts = featuredProducts.map(f => {
      const product = allProducts.find(p => p.id === f.item_id);
      return {
        id: f.id,
        item_type: f.item_type,
        item_id: f.item_id,
        display_order: f.display_order,
        is_active: f.is_active,
        item_data: product ? {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
        } : null,
      };
    });

    const enrichedDoctors = featuredDoctors.map(f => {
      const doctor = allDoctors.find(d => d.id === f.item_id);
      return {
        id: f.id,
        item_type: f.item_type,
        item_id: f.item_id,
        display_order: f.display_order,
        is_active: f.is_active,
        item_data: doctor ? {
          id: doctor.id,
          name: doctor.doctor_name,
          clinic_name: doctor.clinic_name,
          profile_photo_url: doctor.profile_photo_url,
        } : null,
      };
    });

    res.json({
      success: true,
      data: {
        featured_products: enrichedProducts,
        featured_doctors: enrichedDoctors,
        available_products: allProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url,
        })),
        available_doctors: allDoctors.map(d => ({
          id: d.id,
          name: d.doctor_name,
          clinic_name: d.clinic_name,
          profile_photo_url: d.profile_photo_url,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching admin featured items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured items',
    });
  }
};

/**
 * Set featured products (admin)
 * POST /api/admin/featured/products
 */
export const setFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_ids } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length > 4) {
      res.status(400).json({
        success: false,
        message: 'Please provide an array of up to 4 product IDs',
      });
      return;
    }

    const featuredItemRepository = AppDataSource.getRepository(FeaturedItem);

    // Remove existing featured products
    await featuredItemRepository.delete({ item_type: 'product' });

    // Add new featured products
    const newFeaturedProducts = product_ids.map((id: string, index: number) => 
      featuredItemRepository.create({
        item_type: 'product',
        item_id: id,
        display_order: index,
        is_active: true,
      })
    );

    await featuredItemRepository.save(newFeaturedProducts);

    res.json({
      success: true,
      message: 'Featured products updated successfully',
      data: { count: newFeaturedProducts.length },
    });
  } catch (error) {
    console.error('Error setting featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set featured products',
    });
  }
};

/**
 * Set featured doctors (admin)
 * POST /api/admin/featured/doctors
 */
export const setFeaturedDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctor_ids } = req.body;

    if (!Array.isArray(doctor_ids) || doctor_ids.length > 4) {
      res.status(400).json({
        success: false,
        message: 'Please provide an array of up to 4 doctor IDs',
      });
      return;
    }

    const featuredItemRepository = AppDataSource.getRepository(FeaturedItem);

    // Remove existing featured doctors
    await featuredItemRepository.delete({ item_type: 'doctor' });

    // Add new featured doctors
    const newFeaturedDoctors = doctor_ids.map((id: string, index: number) =>
      featuredItemRepository.create({
        item_type: 'doctor',
        item_id: id,
        display_order: index,
        is_active: true,
      })
    );

    await featuredItemRepository.save(newFeaturedDoctors);

    res.json({
      success: true,
      message: 'Featured doctors updated successfully',
      data: { count: newFeaturedDoctors.length },
    });
  } catch (error) {
    console.error('Error setting featured doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set featured doctors',
    });
  }
};

/**
 * Get public products list (for landing page fallback)
 * GET /api/public/products
 */
export const getPublicProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const productRepository = AppDataSource.getRepository(Product);
    const limit = parseInt(req.query.limit as string) || 8;

    const products = await productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.price',
        'product.image_url',
        'product.is_visible',
        'product.stock_quantity',
      ])
      .where('product.is_visible = true')
      .orderBy('product.is_featured', 'DESC')
      .addOrderBy('product.created_at', 'DESC')
      .take(limit)
      .getMany();

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching public products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

