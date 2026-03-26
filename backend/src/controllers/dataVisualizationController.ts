import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { VideoAdvertisement } from '../models/VideoAdvertisement';
import { ResearchPaper } from '../models/ResearchPaper';
import { TierConfig } from '../models/TierConfig';

export class DataVisualizationController {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
        default:
          startDate.setFullYear(2020); // Set to a very early date
          break;
      }

      // Get basic counts
      const [
        totalUsers,
        totalOrders,
        totalProducts,
        totalAdvertisements,
        activeUsers,
        completedOrders,
        pendingOrders
      ] = await Promise.all([
        AppDataSource.getRepository(Doctor).count(),
        AppDataSource.getRepository(Order).count(),
        AppDataSource.getRepository(Product).count(),
        AppDataSource.getRepository(VideoAdvertisement).count(),
        AppDataSource.getRepository(Doctor).count({ where: { is_approved: true, is_deactivated: false } }),
        AppDataSource.getRepository(Order).count({ where: { status: 'completed' } }),
        AppDataSource.getRepository(Order).count({ where: { status: 'pending' } })
      ]);

      // Calculate total revenue
      const revenueResult = await AppDataSource.getRepository(Order)
        .createQueryBuilder('order')
        .select('SUM(order.total_amount)', 'total')
        .where('order.status = :status', { status: 'completed' })
        .getRawOne();
      
      const totalRevenue = parseFloat(revenueResult?.total || '0');

      // Get tier distribution
      const tierDistribution = await AppDataSource.getRepository(Doctor)
        .createQueryBuilder('doctor')
        .select('doctor.current_tier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .groupBy('doctor.current_tier')
        .getRawMany();

      const tierDistributionMap: { [key: string]: number } = {};
      tierDistribution.forEach(item => {
        tierDistributionMap[item.tier || 'No Tier'] = parseInt(item.count);
      });

      // Get monthly revenue (last 12 months)
      const monthlyRevenue = await AppDataSource.getRepository(Order)
        .createQueryBuilder('order')
        .select('DATE_TRUNC(\'month\', order.created_at)', 'month')
        .addSelect('SUM(order.total_amount)', 'revenue')
        .where('order.status = :status', { status: 'completed' })
        .andWhere('order.created_at >= :startDate', { 
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) 
        })
        .groupBy('DATE_TRUNC(\'month\', order.created_at)')
        .orderBy('month', 'ASC')
        .getRawMany();

      const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
        month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: parseFloat(item.revenue || '0')
      }));

      // Get user growth (last 12 months)
      const userGrowth = await AppDataSource.getRepository(Doctor)
        .createQueryBuilder('doctor')
        .select('DATE_TRUNC(\'month\', doctor.created_at)', 'month')
        .addSelect('COUNT(*)', 'users')
        .where('doctor.created_at >= :startDate', { 
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) 
        })
        .groupBy('DATE_TRUNC(\'month\', doctor.created_at)')
        .orderBy('month', 'ASC')
        .getRawMany();

      const formattedUserGrowth = userGrowth.map(item => ({
        month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: parseInt(item.users || '0')
      }));

      // Get order status distribution
      const orderStatusDistribution = await AppDataSource.getRepository(Order)
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('order.status')
        .getRawMany();

      const formattedOrderStatusDistribution = orderStatusDistribution.map(item => ({
        status: item.status || 'unknown',
        count: parseInt(item.count || '0')
      }));

      // Get top products
      const topProducts = await AppDataSource.getRepository(Order)
        .createQueryBuilder('order')
        .leftJoin('order.products', 'product')
        .select('product.name', 'name')
        .addSelect('COUNT(*)', 'orders')
        .addSelect('SUM(order.total_amount)', 'revenue')
        .where('order.status = :status', { status: 'completed' })
        .groupBy('product.name')
        .orderBy('orders', 'DESC')
        .limit(10)
        .getRawMany();

      const formattedTopProducts = topProducts.map(item => ({
        name: item.name || 'Unknown Product',
        orders: parseInt(item.orders || '0'),
        revenue: parseFloat(item.revenue || '0')
      }));

      // Get advertisement performance
      const advertisementPerformance = await AppDataSource.getRepository(VideoAdvertisement)
        .createQueryBuilder('ad')
        .select('ad.selected_area', 'area')
        .addSelect('SUM(ad.impressions)', 'impressions')
        .addSelect('SUM(ad.clicks)', 'clicks')
        .addSelect('AVG(ad.clicks::float / NULLIF(ad.impressions, 0) * 100)', 'ctr')
        .where('ad.status IN (:...statuses)', { statuses: ['approved', 'active', 'ACTIVE'] })
        .groupBy('ad.selected_area')
        .orderBy('impressions', 'DESC')
        .getRawMany();

      const formattedAdvertisementPerformance = advertisementPerformance.map(item => ({
        area: item.area || 'Unknown Area',
        impressions: parseInt(item.impressions || '0'),
        clicks: parseInt(item.clicks || '0'),
        ctr: parseFloat(item.ctr || '0')
      }));

      res.json({
        success: true,
        data: {
          totalUsers,
          totalOrders,
          totalRevenue,
          totalAdvertisements,
          activeUsers,
          completedOrders,
          pendingOrders,
          totalProducts,
          tierDistribution: tierDistributionMap,
          monthlyRevenue: formattedMonthlyRevenue,
          userGrowth: formattedUserGrowth,
          orderStatusDistribution: formattedOrderStatusDistribution,
          topProducts: formattedTopProducts,
          advertisementPerformance: formattedAdvertisementPerformance
        }
      });

    } catch (error: unknown) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }
}
