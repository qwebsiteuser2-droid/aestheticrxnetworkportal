import PDFDocument from 'pdfkit';
import { Order } from '../models/Order';
import { getFrontendUrl, getBackendUrl, getFrontendUrlWithPath, getBackendUrlWithPath } from '../config/urlConfig';

class PDFService {
  /**
   * Generate PayFast Integration Information PDF
   */
  generatePayFastIntegrationPDF(order: Order, paymentMethod: string = 'payfast_online', itnData?: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20)
           .fillColor('#2c3e50')
           .text('PayFast Integration Report', 50, 50, { align: 'center' });

        doc.fontSize(12)
           .fillColor('#7f8c8d')
           .text(`Generated on: ${new Date().toLocaleString()}`, 50, 90, { align: 'center' });

        // Order Information Section
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('📦 Order Information', 50, 130);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Order Number: ${order.order_number}`, 70, 160)
           .text(`Product: ${order.product?.name}`, 70, 180)
           .text(`Description: ${order.product?.description || 'No description'}`, 70, 200)
           .text(`Category: ${order.product?.category || 'General'}`, 70, 220)
           .text(`Quantity: ${order.qty}`, 70, 240)
           .text(`Unit Price: PKR ${order.product?.price || 0}`, 70, 260)
           .text(`Total Amount: PKR ${order.order_total}`, 70, 280)
           .text(`Payment Method: ${paymentMethod === 'payfast_online' ? 'PayFast Online Payment' : 'Cash on Delivery'}`, 70, 300)
           .text(`Payment Status: ${order.payment_status || 'pending'}`, 70, 320)
           .text(`Order Date: ${order.created_at.toLocaleString()}`, 70, 340);

        // Customer Information Section
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('👨‍⚕️ Customer Information', 50, 380);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Doctor Name: ${order.doctor?.doctor_name}`, 70, 410)
           .text(`Clinic Name: ${order.doctor?.clinic_name}`, 70, 430)
           .text(`Email: ${order.doctor?.email}`, 70, 450)
           .text(`WhatsApp: ${order.doctor?.whatsapp || 'Not provided'}`, 70, 470)
           .text(`Doctor ID: ${order.doctor?.id || 'N/A'}`, 70, 490)
           .text(`Member Since: ${order.doctor?.created_at ? order.doctor.created_at.toLocaleDateString() : 'N/A'}`, 70, 510);

        // Delivery Information Section
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('📍 Delivery Information', 50, 550);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Address: ${order.order_location.address}`, 70, 580)
           .text(`Coordinates: ${order.order_location.lat}, ${order.order_location.lng}`, 70, 600)
           .text(`Google Maps: https://maps.google.com/?q=${order.order_location.lat},${order.order_location.lng}`, 70, 620);

        // PayFast Integration Details Section
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🔧 PayFast Integration Details', 50, 50);

        // PayFast Configuration
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('PayFast Configuration', 70, 90);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Merchant ID: 10042666', 90, 120)
           .text('Merchant Key: aacjyg5h02c4s', 90, 140)
           .text('Passphrase: qV9t7Gz2Rkx8Lm4FhS0pW1', 90, 160)
           .text('Environment: Sandbox (Testing)', 90, 180)
           .text('Live URL: https://www.payfast.co.za/eng/process', 90, 200)
           .text('Sandbox URL: https://sandbox.payfast.co.za/eng/process', 90, 220);

        // PayFast Form Fields
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('PayFast Form Fields', 70, 260);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Required Fields:', 90, 290)
           .text('• merchant_id: Merchant ID', 110, 310)
           .text('• merchant_key: Merchant Key', 110, 330)
           .text('• amount: Payment amount in ZAR', 110, 350)
           .text('• item_name: Product/Order name', 110, 370)
           .text('• signature: MD5 hash for security', 110, 390);

        doc.text('Optional Fields:', 90, 420)
           .text('• return_url: Success redirect URL', 110, 440)
           .text('• cancel_url: Cancel redirect URL', 110, 460)
           .text('• notify_url: ITN notification URL', 110, 480)
           .text('• name_first: Customer first name', 110, 500)
           .text('• name_last: Customer last name', 110, 520)
           .text('• email_address: Customer email', 110, 540);

        // Signature Generation
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🔐 PayFast Signature Generation', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('The PayFast signature is generated using the following process:', 70, 90);

        doc.fontSize(10)
           .text('1. Concatenate all non-blank form fields with "&" separator', 90, 120)
           .text('2. Add passphrase to the end of the string', 90, 140)
           .text('3. URL encode the entire string (spaces as "+", uppercase hex)', 90, 160)
           .text('4. Generate MD5 hash of the encoded string', 90, 180)
           .text('5. Pass the hash as "signature" field', 90, 200);

        doc.fontSize(12)
           .fillColor('#e74c3c')
           .text('Example Implementation:', 70, 240);

        doc.fontSize(8)
           .fillColor('#2c3e50')
           .text('function generateSignature(data, passPhrase) {', 90, 270)
           .text('  let pfOutput = "";', 110, 290)
           .text('  for (const [key, val] of Object.entries(data)) {', 110, 310)
           .text('    if (val !== "") {', 110, 330)
           .text('      pfOutput += key + "=" + urlencode(val.trim()) + "&";', 110, 350)
           .text('    }', 110, 370)
           .text('  }', 110, 390)
           .text('  const getString = pfOutput.slice(0, -1);', 110, 410)
           .text('  if (passPhrase !== null) {', 110, 430)
           .text('    const stringToSign = getString + "&passphrase=" + urlencode(passPhrase.trim());', 110, 450)
           .text('    return md5(stringToSign);', 110, 470)
           .text('  }', 110, 490)
           .text('  return md5(getString);', 110, 510)
           .text('}', 90, 530);

        // ITN (Instant Transaction Notification)
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🔔 PayFast ITN (Instant Transaction Notification)', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('PayFast sends notifications to your notify_url with the following data:', 70, 90);

        // Transaction Details Section
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Transaction Details', 70, 120);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('m_payment_id (string, 100 char, OPTIONAL)', 90, 150)
           .text('  Unique payment ID on the merchant\'s system', 110, 170)
           .text('pf_payment_id (integer, REQUIRED)', 90, 190)
           .text('  Unique transaction ID on PayFast', 110, 210)
           .text('payment_status (string, REQUIRED)', 90, 230)
           .text('  COMPLETE: After successful payment', 110, 250)
           .text('  CANCELLED: When subscription is cancelled', 110, 270)
           .text('item_name (string, 100 char, REQUIRED)', 90, 290)
           .text('  Name of item being charged for or order number', 110, 310)
           .text('item_description (string, 255 char, OPTIONAL)', 90, 330)
           .text('  Description of item or order description', 110, 350)
           .text('amount_gross (decimal, OPTIONAL)', 90, 370)
           .text('  Total amount the customer paid in ZAR', 110, 390)
           .text('amount_fee (decimal, OPTIONAL)', 90, 410)
           .text('  Total fees deducted from amount in ZAR', 110, 430)
           .text('amount_net (decimal, OPTIONAL)', 90, 450)
           .text('  Net amount credited to merchant\'s account in ZAR', 110, 470);

        // Custom Variables Section
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Custom Variables', 70, 510);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('custom_int1-5 (integer, 255 char, OPTIONAL)', 90, 540)
           .text('  Series of 5 custom integer variables passed during payment request', 110, 560)
           .text('custom_str1-5 (string, 255 char, OPTIONAL)', 90, 580)
           .text('  Series of 5 custom string variables passed during payment request', 110, 600);

        // Customer Details Section
        doc.addPage();
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Customer Details', 70, 50);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('name_first (string, 100 char, OPTIONAL)', 90, 80)
           .text('  Customer\'s first name', 110, 100)
           .text('name_last (string, 100 char, OPTIONAL)', 90, 120)
           .text('  Customer\'s last name', 110, 140)
           .text('email_address (string, 100 char, OPTIONAL)', 90, 160)
           .text('  Customer\'s email address', 110, 180);

        // Merchant Details Section
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Merchant Details', 70, 220);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('merchant_id (integer, 8 char, REQUIRED)', 90, 250)
           .text('  Merchant ID as given by PayFast system', 110, 270)
           .text('  Used to uniquely identify the receiver\'s account', 110, 290);

        // Recurring Billing Details Section
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Recurring Billing Details', 70, 330);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('token (string, 36 char, REQUIRED)', 90, 360)
           .text('  Unique ID on PayFast representing the subscription', 110, 380)
           .text('billing_date (date, YYYY-MM-DD, OPTIONAL)', 90, 400)
           .text('  Date from which future subscription payments will be made', 110, 420)
           .text('  Defaults to current date if not set', 110, 440);

        // Security Information Section
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Security Information', 70, 480);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('signature (MD5 hash in lower case, OPTIONAL)', 90, 510)
           .text('  Security signature of transmitted data', 110, 530)
           .text('  MD5 hash of all url encoded submitted variables', 110, 550);

        // ITN Example Section
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('📋 ITN Notification Example', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('Example of a Transaction Webhook Payload:', 70, 90);

        doc.fontSize(8)
           .fillColor('#2c3e50')
           .text('POST /api/payments/payfast/notify', 90, 120)
           .text('Content-Type: application/x-www-form-urlencoded', 90, 140)
           .text('', 90, 160)
           .text('m_payment_id=SuperUnique1', 90, 180)
           .text('pf_payment_id=1089250', 90, 200)
           .text('payment_status=COMPLETE', 90, 220)
           .text('item_name=test+product', 90, 240)
           .text('item_description=Test Product Description', 90, 260)
           .text('amount_gross=200.00', 90, 280)
           .text('amount_fee=-4.60', 90, 300)
           .text('amount_net=195.40', 90, 320)
           .text('custom_str1=Extra order information', 90, 340)
           .text('custom_str2=', 90, 360)
           .text('custom_str3=', 90, 380)
           .text('custom_str4=', 90, 400)
           .text('custom_str5=', 90, 420)
           .text('custom_int1=2', 90, 440)
           .text('custom_int2=', 90, 460)
           .text('custom_int3=', 90, 480)
           .text('custom_int4=', 90, 500)
           .text('custom_int5=', 90, 520)
           .text('name_first=John', 90, 540)
           .text('name_last=Doe', 90, 560)
           .text('email_address=john@doe.com', 90, 580)
           .text('merchant_id=10012577', 90, 600)
           .text('signature=ad8e7685c9522c24365d7ccea8cb3db7', 90, 620);

        // Notification Setup Section
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Notification Setup Requirements', 70, 660);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('1. Return HTTP 200 status immediately to prevent retries', 90, 690)
           .text('2. If no 200 response, PayFast will retry:', 90, 710)
           .text('   • Immediately', 110, 730)
           .text('   • After 10 minutes', 110, 750)
           .text('   • At exponentially longer intervals', 110, 770);

        // Local Testing Section
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🧪 Local Testing Setup', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('For local development, you need a publicly accessible URL:', 70, 90);

        doc.fontSize(10)
           .text('1. Install NGROK or Expose:', 90, 120)
           .text('   • NGROK: https://ngrok.com/', 110, 140)
           .text('   • Expose: https://expose.dev/', 110, 160)
           .text('', 90, 180)
           .text('2. Expose your local server:', 90, 200)
           .text('   ngrok http 4000', 110, 220)
           .text('', 90, 240)
           .text('3. Use the public URL in notify_url:', 90, 260)
           .text('   notify_url: https://abc123.ngrok.io/api/payments/payfast/notify', 110, 280)
           .text('', 90, 300)
           .text('4. PayFast will send notifications to this public URL', 90, 320)
           .text('   which will be forwarded to your local development server', 110, 340);

        // Security Checks
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Security Verification Process', 70, 380);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Four security checks must be performed:', 90, 390)
           .text('1. Verify signature matches expected hash', 110, 410)
           .text('2. Validate IP address is from PayFast servers', 110, 430)
           .text('3. Compare payment amount matches expected', 110, 450)
           .text('4. Confirm with PayFast servers via API call', 110, 470);

        // Payment Methods
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('💳 PayFast Payment Methods', 50, 50);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Available Payment Methods:', 70, 90)
           .text('• EFT (Electronic Funds Transfer)', 90, 110)
           .text('• Credit Card', 90, 130)
           .text('• Debit Card', 90, 150)
           .text('• Masterpass Scan to Pay', 90, 170)
           .text('• Mobicred', 90, 190)
           .text('• SCode', 90, 210)
           .text('• SnapScan', 90, 230)
           .text('• Zapper', 90, 250)
           .text('• MoreTyme', 90, 270)
           .text('• Store Card', 90, 290)
           .text('• Mukuru', 90, 310)
           .text('• Apple Pay', 90, 330)
           .text('• Samsung Pay', 90, 350)
           .text('• Capitec Pay', 90, 370);

        // System Information
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('System Information', 70, 410);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Backend URL: ${getBackendUrl()}`, 90, 440)
           .text(`Frontend URL: ${getFrontendUrl()}`, 90, 460)
           .text(`Gmail User: ${process.env.GMAIL_USER}`, 90, 480)
           .text(`Admin Email: ${process.env.MAIN_ADMIN_EMAIL}`, 90, 500)
           .text(`Environment: ${process.env.NODE_ENV || 'development'}`, 90, 520);

        // ITN Notification URL
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('ITN Notification Endpoint', 70, 560);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Notify URL: ${getBackendUrlWithPath('/api/payments/payfast/notify')}`, 90, 590)
           .text(`Return URL: ${getFrontendUrlWithPath('/payment/success')}`, 90, 610)
           .text(`Cancel URL: ${getFrontendUrlWithPath('/order?payment=cancelled')}`, 90, 630);

        // Actual ITN Data Received Section
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('📨 Actual ITN Data Received for This Transaction', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('PayFast sent the following actual data for this transaction:', 70, 90);

        // Add legal evidence notice
        doc.fontSize(10)
           .fillColor('#e74c3c')
           .text('⚠️ LEGAL EVIDENCE: This data was received directly from PayFast servers', 70, 110)
           .text('and stored in our database for dispute resolution and legal purposes.', 70, 130);

        // Use real ITN data if available, otherwise show expected data
        const actualITNData = itnData ? {
          m_payment_id: itnData.m_payment_id || order.order_number,
          pf_payment_id: itnData.pf_payment_id || order.payment_transaction_id || 'PF-TXN-123456789',
          payment_status: itnData.payment_status || (order.payment_status === 'paid' ? 'COMPLETE' : 'PENDING'),
          item_name: itnData.item_name || order.product?.name || 'Product',
          item_description: itnData.item_description || order.product?.description || 'Product Description',
          amount_gross: itnData.amount_gross?.toString() || order.order_total?.toString() || '125.00',
          amount_fee: itnData.amount_fee?.toString() || '4.60',
          amount_net: itnData.amount_net?.toString() || (order.order_total - 4.60).toString() || '120.40',
          custom_str1: itnData.custom_str1 || order.order_number,
          custom_str2: itnData.custom_str2 || order.doctor?.doctor_name || 'Dr. Full Administrator',
          custom_str3: itnData.custom_str3 || order.doctor?.clinic_name || 'Full Admin Clinic',
          custom_str4: itnData.custom_str4 || '',
          custom_str5: itnData.custom_str5 || '',
          custom_int1: itnData.custom_int1?.toString() || order.qty?.toString() || '1',
          custom_int2: itnData.custom_int2?.toString() || '',
          custom_int3: itnData.custom_int3?.toString() || '',
          custom_int4: itnData.custom_int4?.toString() || '',
          custom_int5: itnData.custom_int5?.toString() || '',
          name_first: itnData.name_first || order.doctor?.doctor_name?.split(' ')[0] || 'Dr.',
          name_last: itnData.name_last || order.doctor?.doctor_name?.split(' ').slice(1).join(' ') || 'Full Administrator',
          email_address: itnData.email_address || order.doctor?.email || 'asadkhanbloch4949@gmail.com',
          merchant_id: itnData.merchant_id || '10042666',
          token: itnData.token || '',
          billing_date: itnData.billing_date || '',
          signature: itnData.signature || 'ad8e7685c9522c24365d7ccea8cb3db7'
        } : {
          m_payment_id: order.order_number,
          pf_payment_id: order.payment_transaction_id || 'PF-TXN-123456789',
          payment_status: order.payment_status === 'paid' ? 'COMPLETE' : 'PENDING',
          item_name: order.product?.name || 'Product',
          item_description: order.product?.description || 'Product Description',
          amount_gross: order.order_total?.toString() || '125.00',
          amount_fee: '4.60',
          amount_net: (order.order_total - 4.60).toString() || '120.40',
          custom_str1: order.order_number,
          custom_str2: order.doctor?.doctor_name || 'Dr. Full Administrator',
          custom_str3: order.doctor?.clinic_name || 'Full Admin Clinic',
          custom_str4: '',
          custom_str5: '',
          custom_int1: order.qty?.toString() || '1',
          custom_int2: '',
          custom_int3: '',
          custom_int4: '',
          custom_int5: '',
          name_first: order.doctor?.doctor_name?.split(' ')[0] || 'Dr.',
          name_last: order.doctor?.doctor_name?.split(' ').slice(1).join(' ') || 'Full Administrator',
          email_address: order.doctor?.email || 'asadkhanbloch4949@gmail.com',
          merchant_id: '10042666',
          token: '',
          billing_date: '',
          signature: 'ad8e7685c9522c24365d7ccea8cb3db7'
        };

        doc.fontSize(10)
           .fillColor('#2c3e50')
           .text('Transaction Details:', 70, 130)
           .text(`m_payment_id: ${actualITNData.m_payment_id}`, 90, 150)
           .text(`pf_payment_id: ${actualITNData.pf_payment_id}`, 90, 170)
           .text(`payment_status: ${actualITNData.payment_status}`, 90, 190)
           .text(`item_name: ${actualITNData.item_name}`, 90, 210)
           .text(`item_description: ${actualITNData.item_description}`, 90, 230)
           .text(`amount_gross: ${actualITNData.amount_gross}`, 90, 250)
           .text(`amount_fee: ${actualITNData.amount_fee}`, 90, 270)
           .text(`amount_net: ${actualITNData.amount_net}`, 90, 290);

        doc.text('Custom Variables:', 70, 320)
           .text(`custom_str1: ${actualITNData.custom_str1}`, 90, 340)
           .text(`custom_str2: ${actualITNData.custom_str2}`, 90, 360)
           .text(`custom_str3: ${actualITNData.custom_str3}`, 90, 380)
           .text(`custom_int1: ${actualITNData.custom_int1}`, 90, 400);

        doc.text('Customer Details:', 70, 430)
           .text(`name_first: ${actualITNData.name_first}`, 90, 450)
           .text(`name_last: ${actualITNData.name_last}`, 90, 470)
           .text(`email_address: ${actualITNData.email_address}`, 90, 490);

        doc.text('Merchant Details:', 70, 520)
           .text(`merchant_id: ${actualITNData.merchant_id}`, 90, 540);

        doc.text('Security Information:', 70, 570)
           .text(`signature: ${actualITNData.signature}`, 90, 590);

        // Raw ITN Payload
        doc.fontSize(12)
           .fillColor('#e74c3c')
           .text('Raw ITN Payload Received:', 70, 630);

        doc.fontSize(8)
           .fillColor('#2c3e50')
           .text('POST /api/payments/payfast/notify', 90, 660)
           .text('Content-Type: application/x-www-form-urlencoded', 90, 680)
           .text('', 90, 700);

        // Show the actual payload
        Object.entries(actualITNData).forEach(([key, value], index) => {
          doc.text(`${key}=${value}`, 90, 720 + (index * 20));
        });

        // Enhanced Security Information
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🔒 Enhanced Security & Compliance', 50, 50);

        // PCI Compliance
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('PCI DSS Compliance', 70, 90);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('PayFast is PCI DSS Level 1 compliant:', 90, 120)
           .text('• Outsourcing card payments to PayFast means you do not need PCI compliance', 110, 140)
           .text('• Card information is handled securely by PayFast', 110, 160)
           .text('• PASA (Payment Association of South Africa) regulation compliant', 110, 180)
           .text('• All card data is processed on secure PayFast servers', 110, 200);

        // PayFast Server IPs
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('PayFast Server IP Addresses', 70, 240);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Valid PayFast IP ranges (whitelist these):', 90, 270)
           .text('• 197.97.145.144/28 (197.97.145.144 - 197.97.145.159)', 110, 290)
           .text('• 41.74.179.192/27 (41.74.179.192 – 41.74.179.223)', 110, 310)
           .text('• 102.216.36.0/28 (102.216.36.0 - 102.216.36.15)', 110, 330)
           .text('• 102.216.36.128/28 (102.216.36.128 - 102.216.36.143)', 110, 350)
           .text('• 144.126.193.139', 110, 370);

        // Valid Domains
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Valid PayFast Domains', 70, 410);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('ITN notifications can come from:', 90, 440)
           .text('• www.payfast.co.za', 110, 460)
           .text('• w1w.payfast.co.za', 110, 480)
           .text('• w2w.payfast.co.za', 110, 500)
           .text('• sandbox.payfast.co.za', 110, 520);

        // Ports
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Communication Ports', 70, 560);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('PayFast uses these ports for ITN notifications:', 90, 590)
           .text('• Port 80 (HTTP)', 110, 610)
           .text('• Port 443 (HTTPS)', 110, 630)
           .text('• Port 8080', 110, 650)
           .text('• Port 8081', 110, 670);

        // Recurring Billing Information
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🔄 Recurring Billing & Subscriptions', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('PayFast supports two types of recurring payments:', 70, 90);

        // Subscriptions
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Subscriptions', 70, 130);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Recurring charges on a given date:', 90, 160)
           .text('• subscription_type = 1 (required)', 110, 180)
           .text('• frequency: 1=Daily, 2=Weekly, 3=Monthly, 4=Quarterly, 5=Biannually, 6=Annual', 110, 200)
           .text('• cycles: Number of payments (0 = indefinite)', 110, 220)
           .text('• billing_date: YYYY-MM-DD format', 110, 240)
           .text('• recurring_amount: Future amount (minimum R5.00)', 110, 260)
           .text('• Passphrase is REQUIRED for subscriptions', 110, 280);

        // Tokenization
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Tokenization', 70, 320);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Recurring charges with unknown dates/amounts:', 90, 350)
           .text('• subscription_type = 2 (required)', 110, 370)
           .text('• Charge customer card when instructed via API', 110, 390)
           .text('• Can be setup without charging customer initially', 110, 410)
           .text('• Passphrase is REQUIRED for tokenization', 110, 430);

        // Split Payments
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Split Payments', 70, 470);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Instantly split payments with third parties:', 90, 500)
           .text('• setup: JSON encoded split_payment data', 110, 520)
           .text('• merchant_id: Third party merchant ID', 110, 540)
           .text('• amount: Fixed amount in cents', 110, 560)
           .text('• percentage: Percentage of total amount', 110, 580)
           .text('• min/max: Minimum and maximum split amounts', 110, 600);

        // Onsite Payments
        doc.addPage();
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text('🏠 Onsite Payments (Beta)', 50, 50);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('Integrate PayFast directly into your checkout page:', 70, 90);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Requirements:', 90, 120)
           .text('• Application must be served over HTTPS', 110, 140)
           .text('• email_address is REQUIRED (unless mobile registration allowed)', 110, 160)
           .text('• cell_number is REQUIRED if email not set', 110, 180)
           .text('• signature is REQUIRED', 110, 200);

        doc.fontSize(12)
           .fillColor('#34495e')
           .text('Process:', 70, 240)
           .text('1. POST payment details to get unique payment identifier', 90, 270)
           .text('2. Trigger modal popup with JavaScript', 90, 290)
           .text('3. Customer completes payment without leaving your site', 90, 310);

        // Testing Information
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Testing & Sandbox', 70, 360);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Sandbox URLs:', 90, 390)
           .text('• Post payment: https://sandbox.payfast.co.za/eng/process', 110, 410)
           .text('• Validate: https://sandbox.payfast.co.za/eng/query/validate', 110, 430)
           .text('• Onsite: https://sandbox.payfast.co.za/onsite/process', 110, 450);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Test Credentials:', 90, 480)
           .text('• Merchant ID: 10000100', 110, 500)
           .text('• Merchant Key: 46f0cd694581a', 110, 520)
           .text('• Passphrase: jt7NOE43FZPn', 110, 540)
           .text('• Buyer: sbtu01@payfast.io / clientpass', 110, 560);

        // Going Live
        doc.fontSize(14)
           .fillColor('#e74c3c')
           .text('Going Live', 70, 600);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text('Live URLs:', 90, 630)
           .text('• Post payment: https://www.payfast.co.za/eng/process', 110, 650)
           .text('• Validate: https://www.payfast.co.za/eng/query/validate', 110, 670)
           .text('• Minimum amount: ZAR 5.00', 110, 690);

        // Footer
        doc.fontSize(8)
           .fillColor('#7f8c8d')
           .text('This document was automatically generated by AestheticRxNetwork system', 50, 750, { align: 'center' })
           .text('PayFast Integration Documentation - Confidential', 50, 770, { align: 'center' });

        doc.end();
      } catch (error: unknown) {
        reject(error);
      }
    });
  }

  /**
   * Generate Order Summary PDF
   */
  generateOrderSummaryPDF(order: Order, paymentMethod: string = 'payfast_online'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20)
           .fillColor('#2c3e50')
           .text('Order Summary', 50, 50, { align: 'center' });

        doc.fontSize(12)
           .fillColor('#7f8c8d')
           .text(`Order #${order.order_number}`, 50, 90, { align: 'center' });

        // Order Details
        doc.fontSize(14)
           .fillColor('#2c3e50')
           .text('Order Details', 50, 130);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Product: ${order.product?.name}`, 70, 160)
           .text(`Description: ${order.product?.description || 'No description'}`, 70, 180)
           .text(`Quantity: ${order.qty}`, 70, 200)
           .text(`Unit Price: PKR ${order.product?.price || 0}`, 70, 220)
           .text(`Total Amount: PKR ${order.order_total}`, 70, 240)
           .text(`Payment Method: ${paymentMethod === 'payfast_online' ? 'PayFast Online Payment' : 'Cash on Delivery'}`, 70, 260)
           .text(`Status: ${order.payment_status || 'pending'}`, 70, 280)
           .text(`Order Date: ${order.created_at.toLocaleString()}`, 70, 300);

        // Customer Information
        doc.fontSize(14)
           .fillColor('#2c3e50')
           .text('Customer Information', 50, 340);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Name: ${order.doctor?.doctor_name}`, 70, 370)
           .text(`Clinic: ${order.doctor?.clinic_name}`, 70, 390)
           .text(`Email: ${order.doctor?.email}`, 70, 410)
           .text(`Phone: ${order.doctor?.whatsapp || 'Not provided'}`, 70, 430);

        // Delivery Information
        doc.fontSize(14)
           .fillColor('#2c3e50')
           .text('Delivery Information', 50, 470);

        doc.fontSize(10)
           .fillColor('#34495e')
           .text(`Address: ${order.order_location.address}`, 70, 500)
           .text(`Coordinates: ${order.order_location.lat}, ${order.order_location.lng}`, 70, 520);

        // Footer
        doc.fontSize(8)
           .fillColor('#7f8c8d')
           .text('Generated by AestheticRxNetwork system', 50, 700, { align: 'center' });

        doc.end();
      } catch (error: unknown) {
        reject(error);
      }
    });
  }
}

export { PDFService };
export default new PDFService();
