import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { ResearchPaper } from '../models/ResearchPaper';
import { Doctor } from '../models/Doctor';
import gmailService from '../services/gmailService';
import { whatsappService } from '../services/whatsappService';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

/**
 * Generate monthly report with CSV exports
 */
export const generateMonthlyReport = async (): Promise<void> => {
  try {
    console.log('📊 Starting monthly report generation...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Get previous month's date range
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    console.log(`📅 Generating report for: ${previousMonth.toISOString().slice(0, 7)}`);

    // Create reports directory
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportDate = previousMonth.toISOString().slice(0, 7);
    const reportDir = path.join(reportsDir, reportDate);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate CSV files
    await generateOrdersCSV(reportDir, previousMonth, endOfPreviousMonth);
    await generateResearchCSV(reportDir, previousMonth, endOfPreviousMonth);
    await generateSalesSummaryCSV(reportDir, previousMonth, endOfPreviousMonth);
    await generateUsersCSV(reportDir);

    // Create zip file
    const zipPath = path.join(reportsDir, `monthly-report-${reportDate}.zip`);
    await createZipFile(reportDir, zipPath);

    // Prepare report data for notifications
    const reportData = await getReportSummary(previousMonth, endOfPreviousMonth);

    // Send notifications to admins
    try {
      await gmailService.sendMonthlyReport(reportData, zipPath);
      await whatsappService.sendMonthlyReport(reportData);
    } catch (error: unknown) {
      console.error('Failed to send monthly report notifications:', error);
    }

    // Clean up temporary files
    fs.rmSync(reportDir, { recursive: true, force: true });

    console.log('✅ Monthly report generated successfully');
    console.log(`📁 Report saved to: ${zipPath}`);

  } catch (error: unknown) {
    console.error('❌ Monthly report generation failed:', error);
    throw error;
  }
};

/**
 * Generate orders CSV
 */
const generateOrdersCSV = async (reportDir: string, startDate: Date, endDate: Date): Promise<void> => {
  const orderRepository = AppDataSource.getRepository(Order);
  
  const orders = await orderRepository.find({
    where: {
      created_at: {
        $gte: startDate,
        $lte: endDate
      } as any
    },
    relations: ['doctor', 'product'],
    order: { created_at: 'DESC' }
  });

  const csvContent = [
    'Order Number,Doctor Name,Clinic Name,Product Name,Quantity,Total,Status,Order Date,Location',
    ...orders.map(order => [
      order.order_number,
      order.doctor?.doctor_name || 'N/A',
      order.doctor?.clinic_name || 'N/A',
      order.product?.name || 'N/A',
      order.qty,
      order.order_total,
      order.status,
      order.created_at.toISOString().split('T')[0],
      order.order_location.address
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const filePath = path.join(reportDir, 'orders.csv');
  fs.writeFileSync(filePath, csvContent);
  console.log(`📄 Orders CSV generated: ${orders.length} orders`);
};

/**
 * Generate research papers CSV
 */
const generateResearchCSV = async (reportDir: string, startDate: Date, endDate: Date): Promise<void> => {
  const researchRepository = AppDataSource.getRepository(ResearchPaper);
  
  const papers = await researchRepository.find({
    where: {
      created_at: {
        $gte: startDate,
        $lte: endDate
      } as any
    },
    relations: ['doctor'],
    order: { created_at: 'DESC' }
  });

  const csvContent = [
    'Title,Doctor Name,Clinic Name,Status,View Count,Upvote Count,Submission Date,Approval Date',
    ...papers.map(paper => [
      paper.title,
      paper.doctor?.doctor_name || 'N/A',
      paper.doctor?.clinic_name || 'N/A',
      paper.is_approved ? 'Approved' : 'Pending',
      paper.view_count,
      paper.upvote_count,
      paper.created_at.toISOString().split('T')[0],
      paper.approved_at?.toISOString().split('T')[0] || 'N/A'
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const filePath = path.join(reportDir, 'research_papers.csv');
  fs.writeFileSync(filePath, csvContent);
  console.log(`📄 Research CSV generated: ${papers.length} papers`);
};

/**
 * Generate sales summary CSV
 */
const generateSalesSummaryCSV = async (reportDir: string, startDate: Date, endDate: Date): Promise<void> => {
  const orderRepository = AppDataSource.getRepository(Order);
  const doctorRepository = AppDataSource.getRepository(Doctor);
  
  // Get all doctors with their sales for the month
  const doctors = await doctorRepository.find({
    relations: ['orders']
  });

  const salesData = doctors.map(doctor => {
    const monthlyOrders = doctor.orders.filter(order => 
      order.created_at >= startDate && 
      order.created_at <= endDate &&
      ['accepted', 'completed'].includes(order.status)
    );
    
    const monthlySales = monthlyOrders.reduce((sum, order) => sum + order.order_total, 0);
    const totalSales = doctor.orders
      .filter(order => ['accepted', 'completed'].includes(order.status))
      .reduce((sum, order) => sum + order.order_total, 0);

    return {
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.doctor_name,
      clinic_name: doctor.clinic_name,
      monthly_sales: monthlySales,
      total_sales: totalSales,
      monthly_orders: monthlyOrders.length,
      tier: getTierFromSales(totalSales)
    };
  }).filter(doctor => doctor.monthly_sales > 0 || doctor.total_sales > 0);

  const csvContent = [
    'Doctor ID,Doctor Name,Clinic Name,Monthly Sales,Total Sales,Monthly Orders,Current Tier',
    ...salesData.map(doctor => [
      doctor.doctor_id,
      doctor.doctor_name,
      doctor.clinic_name,
      doctor.monthly_sales,
      doctor.total_sales,
      doctor.monthly_orders,
      doctor.tier
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const filePath = path.join(reportDir, 'sales_summary.csv');
  fs.writeFileSync(filePath, csvContent);
  console.log(`📄 Sales Summary CSV generated: ${salesData.length} doctors`);
};

/**
 * Generate users CSV
 */
const generateUsersCSV = async (reportDir: string): Promise<void> => {
  const doctorRepository = AppDataSource.getRepository(Doctor);
  
  const doctors = await doctorRepository.find({
    order: { created_at: 'DESC' }
  });

  const csvContent = [
    'Doctor ID,Doctor Name,Clinic Name,Email,WhatsApp,Status,Registration Date,Approval Date',
    ...doctors.map(doctor => [
      doctor.doctor_id,
      doctor.doctor_name,
      doctor.clinic_name,
      doctor.email,
      doctor.whatsapp || 'N/A',
      doctor.is_approved ? 'Approved' : 'Pending',
      doctor.created_at.toISOString().split('T')[0],
      doctor.approved_at?.toISOString().split('T')[0] || 'N/A'
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const filePath = path.join(reportDir, 'users.csv');
  fs.writeFileSync(filePath, csvContent);
  console.log(`📄 Users CSV generated: ${doctors.length} users`);
};

/**
 * Create zip file from report directory
 */
const createZipFile = async (sourceDir: string, zipPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 Zip file created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
};

/**
 * Get report summary for notifications
 */
const getReportSummary = async (startDate: Date, endDate: Date): Promise<any> => {
  const orderRepository = AppDataSource.getRepository(Order);
  const researchRepository = AppDataSource.getRepository(ResearchPaper);
  const doctorRepository = AppDataSource.getRepository(Doctor);

  const [totalOrders, totalSales, newRegistrations, researchSubmissions] = await Promise.all([
    orderRepository.count({
      where: {
        created_at: {
          $gte: startDate,
          $lte: endDate
        } as any
      }
    }),
    orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.order_total)', 'total')
      .where('order.created_at >= :startDate', { startDate })
      .andWhere('order.created_at <= :endDate', { endDate })
      .andWhere('order.status IN (:...statuses)', { statuses: ['accepted', 'completed'] })
      .getRawOne(),
    doctorRepository.count({
      where: {
        created_at: {
          $gte: startDate,
          $lte: endDate
        } as any
      }
    }),
    researchRepository.count({
      where: {
        created_at: {
          $gte: startDate,
          $lte: endDate
        } as any
      }
    })
  ]);

  return {
    month: startDate.toISOString().slice(0, 7),
    totalOrders,
    totalSales: parseFloat(totalSales.total) || 0,
    newRegistrations,
    researchSubmissions
  };
};

/**
 * Get tier from sales amount
 */
const getTierFromSales = (sales: number): string => {
  if (sales >= 100000) return 'Grandmaster';
  if (sales >= 50000) return 'Master';
  if (sales >= 25000) return 'Expert';
  if (sales >= 10000) return 'Contributor';
  return 'Starter';
};

// Run if called directly
if (require.main === module) {
  generateMonthlyReport()
    .then(() => {
      console.log('🎉 Monthly report completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Monthly report failed:', error);
      process.exit(1);
    });
}

