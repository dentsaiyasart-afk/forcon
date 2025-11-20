// api/index.js - PDFKit with Thai Font (STABLE & WORKING VERSION)
// ====================================================

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const axios = require('axios');

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ====================================================
// DOWNLOAD THAI FONT
// ====================================================

let thaiFont = null;
let thaiFontBold = null;

async function downloadThaiFont() {
    if (thaiFont && thaiFontBold) {
        return { regular: thaiFont, bold: thaiFontBold };
    }
    
    try {
        console.log('Downloading Thai fonts...');
        
        // Regular font
        const regularResponse = await axios.get(
            'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Regular.ttf',
            { responseType: 'arraybuffer', timeout: 15000 }
        );
        thaiFont = Buffer.from(regularResponse.data);
        
        // Bold font
        const boldResponse = await axios.get(
            'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Bold.ttf',
            { responseType: 'arraybuffer', timeout: 15000 }
        );
        thaiFontBold = Buffer.from(boldResponse.data);
        
        console.log('Thai fonts downloaded successfully');
        return { regular: thaiFont, bold: thaiFontBold };
        
    } catch (error) {
        console.error('Error downloading Thai fonts:', error.message);
        throw new Error('Cannot download Thai fonts: ' + error.message);
    }
}


// ====================================================
// ERROR HANDLING
// ====================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// ====================================================
// UTILITY FUNCTIONS
// ====================================================

async function sendEmail(to, subject, html, attachments = []) {
    try {
        await transporter.sendMail({
            from: `"${process.env.COMPANY_NAME || 'HR Department'}" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
            attachments: attachments
        });
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// ====================================================
// PDF GENERATION FUNCTION
// ====================================================

async function generateJobApplicationPDF(data) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('Starting PDF generation...');
            
            // Download fonts
            const fonts = await downloadThaiFont();
            console.log('Fonts ready');
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 40, right: 40 }
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                console.log('PDF generation completed');
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', (err) => {
                console.error('PDF generation error:', err);
                reject(err);
            });

            // Register fonts
            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('Sarabun-Bold', fonts.bold);

            // Colors
            const primaryColor = '#667eea';
            const textColor = '#2d3748';
            const lightBg = '#f7fafc';

            let yPos = 40;

            // ====================================================
            // HEADER
            // ====================================================
            
            // Gradient background
            for (let i = 0; i < 80; i++) {
                const ratio = i / 80;
                const r = Math.round(102 + ratio * (118 - 102));
                const g = Math.round(126 + ratio * (75 - 126));
                const b = Math.round(234 + ratio * (162 - 234));
                doc.rect(0, i, doc.page.width, 1).fill(`rgb(${r}, ${g}, ${b})`);
            }
            
            doc.fillColor('#FFFFFF')
               .font('Sarabun-Bold')
               .fontSize(26)
               .text('ใบสมัครงาน', 0, 25, { align: 'center' });
            
            doc.fontSize(12)
               .font('Sarabun')
               .text('Job Application Form', 0, 55, { align: 'center' });
            
            yPos = 100;
            
            // Application Info
            doc.rect(40, yPos, doc.page.width - 80, 35).fill(lightBg);
            
            doc.fillColor(textColor)
               .fontSize(10)
               .font('Sarabun-Bold')
               .text('รหัสใบสมัคร:', 50, yPos + 10);
            
            doc.fillColor(primaryColor)
               .font('Sarabun')
               .text(data.id, 130, yPos + 10);
            
            doc.fillColor(textColor)
               .font('Sarabun-Bold')
               .text('วันที่:', 350, yPos + 10);
            
            doc.font('Sarabun')
               .text(new Date().toLocaleDateString('th-TH', {
                   year: 'numeric',
                   month: 'long',
                   day: 'numeric'
               }), 380, yPos + 10);
            
            yPos += 60;
            
            // ====================================================
            // SECTION: Personal Information
            // ====================================================
            
            addSectionHeader(doc, 'ข้อมูลส่วนตัว', yPos);
            yPos += 35;
            
            // Position highlight
            doc.rect(40, yPos - 3, doc.page.width - 80, 22).fill('#edf2f7');
            
            doc.fillColor(primaryColor)
               .fontSize(11)
               .font('Sarabun-Bold')
               .text('ตำแหน่งที่สมัคร:', 50, yPos);
            
            doc.fillColor('#e53e3e')
               .fontSize(12)
               .text(data.position, 160, yPos);
            
            yPos += 30;
            
            // Personal info fields
            addTwoColumn(doc, 'ชื่อ-นามสกุล (ไทย):', data.personal_info.fullname_th,
                         'Full Name (English):', data.personal_info.fullname_en || '-', yPos);
            yPos += 20;
            
            addTwoColumn(doc, 'เพศ:', data.personal_info.gender,
                         'วันเกิด:', `${data.personal_info.birthdate} (${data.personal_info.age} ปี)`, yPos);
            yPos += 20;
            
            addTwoColumn(doc, 'สัญชาติ:', data.personal_info.nationality,
                         'เชื้อชาติ:', data.personal_info.ethnicity, yPos);
            yPos += 20;
            
            addTwoColumn(doc, 'ศาสนา:', data.personal_info.religion,
                         'เลขบัตรประชาชน:', data.personal_info.id_card, yPos);
            yPos += 20;
            
            addTwoColumn(doc, 'เบอร์โทร:', data.personal_info.phone,
                         'LINE ID:', data.personal_info.line_id, yPos);
            yPos += 20;
            
            addSingleField(doc, 'อีเมล:', data.personal_info.email, yPos);
            yPos += 20;
            
            addSingleField(doc, 'ที่อยู่:', data.personal_info.address.full, yPos);
            yPos += 20;
            
            addSingleField(doc, 'ตำบล/อำเภอ/จังหวัด:', 
                `${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}, ${data.personal_info.address.province} ${data.personal_info.address.zipcode}`,
                yPos);
            yPos += 40;
            
            // Check new page
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }
            
            // ====================================================
            // SECTION: Education
            // ====================================================
            
            addSectionHeader(doc, 'ประวัติการศึกษา', yPos);
            yPos += 35;
            
            if (data.education.high_school.school) {
                addEducationItem(doc, 'มัธยมศึกษา/เทียบเท่า', 
                    data.education.high_school.school,
                    data.education.high_school.major,
                    data.education.high_school.year, yPos);
                yPos += 45;
            }
            
            if (data.education.vocational.school) {
                addEducationItem(doc, 'ปวช./ปวส.', 
                    data.education.vocational.school,
                    data.education.vocational.major,
                    data.education.vocational.year, yPos);
                yPos += 45;
            }
            
            if (data.education.bachelor.school) {
                addEducationItem(doc, 'ปริญญาตรี', 
                    data.education.bachelor.school,
                    data.education.bachelor.major,
                    data.education.bachelor.year, yPos);
                yPos += 45;
            }
            
            if (data.education.other.school) {
                addEducationItem(doc, 'อื่นๆ', 
                    data.education.other.school,
                    data.education.other.major,
                    data.education.other.year, yPos);
                yPos += 45;
            }
            
            // Education used
            doc.rect(40, yPos - 3, doc.page.width - 80, 22).fill('#edf2f7');
            doc.fillColor(primaryColor)
               .fontSize(11)
               .font('Sarabun-Bold')
               .text('วุฒิการศึกษาที่ใช้สมัคร:', 50, yPos);
            doc.fillColor(textColor)
               .font('Sarabun-Bold')
               .text(data.education.education_used, 200, yPos);
            yPos += 40;
            
            // Check new page
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }
            
            // ====================================================
            // SECTION: Work Experience
            // ====================================================
            
            addSectionHeader(doc, 'ประสบการณ์การทำงาน', yPos);
            yPos += 35;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    if (yPos > 650) {
                        doc.addPage();
                        yPos = 50;
                    }
                    
                    addWorkCard(doc, work, index + 1, yPos);
                    yPos += 110;
                });
            } else {
                doc.fillColor('#a0aec0')
                   .fontSize(10)
                   .font('Sarabun')
                   .text('ไม่มีประสบการณ์ทำงาน', 50, yPos);
                yPos += 30;
            }
            
            // Check new page
            if (yPos > 650) {
                doc.addPage();
                yPos = 50;
            }
            
            // ====================================================
            // SECTION: Additional Info
            // ====================================================
            
            addSectionHeader(doc, 'ข้อมูลเพิ่มเติม', yPos);
            yPos += 35;
            
            if (data.additional_info.has_disease) {
                addSingleField(doc, 'มีโรคประจำตัวหรือไม่:', data.additional_info.has_disease, yPos);
                yPos += 20;
                if (data.additional_info.disease_detail) {
                    addSingleField(doc, 'รายละเอียด:', data.additional_info.disease_detail, yPos);
                    yPos += 20;
                }
            }
            
            if (data.additional_info.has_criminal_record) {
                addSingleField(doc, 'เคยต้องโทษหรือไม่:', data.additional_info.has_criminal_record, yPos);
                yPos += 20;
                if (data.additional_info.criminal_detail) {
                    addSingleField(doc, 'รายละเอียด:', data.additional_info.criminal_detail, yPos);
                    yPos += 20;
                }
            }
            
            if (data.additional_info.special_skills) {
                addSingleField(doc, 'ทักษะพิเศษ:', data.additional_info.special_skills, yPos);
                yPos += 20;
            }
            
            if (data.additional_info.expected_salary) {
                addSingleField(doc, 'เงินเดือนที่คาดหวัง:', `${data.additional_info.expected_salary} บาท`, yPos);
                yPos += 20;
            }
            
            if (data.additional_info.start_date) {
                addSingleField(doc, 'สามารถเริ่มงานได้:', data.additional_info.start_date, yPos);
                yPos += 20;
            }
            
            if (data.additional_info.motivation) {
                yPos += 5;
                doc.rect(40, yPos - 3, doc.page.width - 80, 60).fill('#f0f4ff');
                doc.fillColor(primaryColor)
                   .fontSize(10)
                   .font('Sarabun-Bold')
                   .text('เหตุผลที่ต้องการร่วมงาน:', 50, yPos);
                yPos += 18;
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(data.additional_info.motivation, 50, yPos, {
                       width: doc.page.width - 100,
                       align: 'left'
                   });
            }
            
            // Footer
            const footerY = doc.page.height - 35;
            doc.moveTo(40, footerY - 10)
               .lineTo(doc.page.width - 40, footerY - 10)
               .strokeColor('#e2e8f0')
               .lineWidth(0.5)
               .stroke();
            
            doc.fontSize(8)
               .fillColor('#718096')
               .font('Sarabun')
               .text('สร้างโดยระบบรับสมัครงานอัตโนมัติ | Generated by Job Application System', 0, footerY, { 
                   align: 'center'
               });
            
            doc.end();
            
            // ====================================================
            // Helper Functions
            // ====================================================
            
            function addSectionHeader(doc, title, y) {
                doc.rect(40, y - 5, doc.page.width - 80, 28).fill(primaryColor);
                doc.fillColor('#FFFFFF')
                   .fontSize(14)
                   .font('Sarabun-Bold')
                   .text(title, 50, y + 2);
            }
            
            function addSingleField(doc, label, value, y) {
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(label, 50, y);
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(value || '-', 170, y, { width: doc.page.width - 210 });
            }
            
            function addTwoColumn(doc, label1, value1, label2, value2, y) {
                const mid = doc.page.width / 2;
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(label1, 50, y);
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(value1 || '-', 150, y, { width: mid - 160 });
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(label2, mid + 10, y);
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(value2 || '-', mid + 110, y, { width: mid - 120 });
            }
            
            function addEducationItem(doc, level, school, major, year, y) {
                doc.roundedRect(40, y - 3, doc.page.width - 80, 38, 3)
                   .fillAndStroke('#fafafa', '#e2e8f0');
                doc.rect(50, y + 5, 80, 18).fill('#e6f0ff');
                doc.fillColor(primaryColor)
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(level, 55, y + 9);
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(school, 140, y + 5);
                doc.fillColor('#718096')
                   .fontSize(9)
                   .text(`${major || '-'} | ${year || '-'}`, 140, y + 20);
            }
            
            function addWorkCard(doc, work, num, y) {
                doc.roundedRect(40, y, doc.page.width - 80, 100, 5)
                   .fillAndStroke('#ffffff', '#e2e8f0');
                doc.roundedRect(41, y + 1, doc.page.width - 82, 98, 5).fill('#fafafa');
                doc.rect(40, y, doc.page.width - 80, 25).fill('#f0f4ff');
                doc.fillColor(primaryColor)
                   .fontSize(11)
                   .font('Sarabun-Bold')
                   .text(`ประสบการณ์ที่ ${num}`, 50, y + 7);
                
                y += 32;
                doc.fillColor('#4a5568').fontSize(9).font('Sarabun-Bold').text('บริษัท:', 50, y);
                doc.fillColor(textColor).fontSize(10).font('Sarabun').text(work.company, 110, y);
                y += 16;
                doc.fillColor('#4a5568').fontSize(9).font('Sarabun-Bold').text('ตำแหน่ง:', 50, y);
                doc.fillColor(textColor).fontSize(10).font('Sarabun').text(work.position || '-', 110, y);
                y += 16;
                doc.fillColor('#4a5568').fontSize(9).font('Sarabun-Bold').text('ระยะเวลา:', 50, y);
                doc.fillColor(textColor).fontSize(9).font('Sarabun').text(`${work.start || '-'} ถึง ${work.end || '-'}`, 110, y);
                y += 16;
                doc.fillColor('#4a5568').fontSize(9).font('Sarabun-Bold').text('เหตุผล:', 50, y);
                doc.fillColor(textColor).fontSize(9).font('Sarabun').text(work.reason || '-', 110, y, { width: doc.page.width - 150 });
            }
            
        } catch (error) {
            console.error('PDF generation error:', error);
            reject(error);
        }
    });
}

// ====================================================
// ENDPOINTS
// ====================================================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Job Application API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'Job Application API',
        endpoints: ['GET  /api/health', 'POST /api/job-application']
    });
});

app.post('/api/job-application', upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Received job application request');
        
        const {
            position, fullname_th, fullname_en, gender, birthdate, age,
            nationality, ethnicity, religion, id_card, phone, line_id, email,
            address, subdistrict, district, province, zipcode,
            edu_high_school, edu_high_major, edu_high_year,
            edu_vocational, edu_vocational_major, edu_vocational_year,
            edu_bachelor, edu_bachelor_major, edu_bachelor_year,
            edu_other, edu_other_major, edu_other_year, education_used,
            work1_company, work1_position, work1_start, work1_end, work1_reason,
            work2_company, work2_position, work2_start, work2_end, work2_reason,
            work3_company, work3_position, work3_start, work3_end, work3_reason,
            has_disease, disease_detail, has_criminal_record, criminal_detail,
            special_skills, expected_salary, start_date, motivation
        } = req.body;
        
        // Validation
        if (!position || !fullname_th || !gender || !birthdate || !age || 
            !nationality || !ethnicity || !religion || !id_card || !phone || 
            !line_id || !email || !education_used) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
            });
        }

        const idCardDigits = id_card.replace(/\D/g, '');
        if (idCardDigits.length !== 13) {
            return res.status(400).json({
                success: false,
                message: 'หมายเลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }

        if (!req.files || !req.files.photo) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาแนบรูปถ่ายหน้าตรง'
            });
        }
        
        // Create application object
        const application = {
            id: `APP${Date.now()}`,
            position,
            personal_info: {
                fullname_th, fullname_en, gender, birthdate, age,
                nationality, ethnicity, religion,
                id_card: idCardDigits, phone, line_id, email,
                address: { full: address, subdistrict, district, province, zipcode }
            },
            education: {
                high_school: { school: edu_high_school, major: edu_high_major, year: edu_high_year },
                vocational: { school: edu_vocational, major: edu_vocational_major, year: edu_vocational_year },
                bachelor: { school: edu_bachelor, major: edu_bachelor_major, year: edu_bachelor_year },
                other: { school: edu_other, major: edu_other_major, year: edu_other_year },
                education_used
            },
            work_experience: [
                { company: work1_company, position: work1_position, start: work1_start, end: work1_end, reason: work1_reason },
                { company: work2_company, position: work2_position, start: work2_start, end: work2_end, reason: work2_reason },
                { company: work3_company, position: work3_position, start: work3_start, end: work3_end, reason: work3_reason }
            ].filter(w => w.company),
            additional_info: {
                has_disease, disease_detail, has_criminal_record, criminal_detail,
                special_skills, expected_salary, start_date, motivation
            },
            submitted_at: new Date().toISOString(),
            status: 'pending'
        };
        
        console.log('Generating PDF...');
        const pdfBuffer = await generateJobApplicationPDF(application);
        console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        
        // Prepare attachments
        const attachments = [
            {
                filename: `Job_Application_${fullname_th}_${application.id}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            },
            {
                filename: `Photo_${fullname_th}_${req.files.photo[0].originalname}`,
                content: req.files.photo[0].buffer,
                contentType: req.files.photo[0].mimetype
            }
        ];

        if (req.files.resume && req.files.resume[0]) {
            attachments.push({
                filename: req.files.resume[0].originalname,
                content: req.files.resume[0].buffer,
                contentType: req.files.resume[0].mimetype
            });
        }
        
        // Send emails
        console.log('Sending emails...');
        
        const applicantEmailHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;"><h1>🌟 ยืนยันการสมัครงาน</h1><h2>ขอบคุณที่สมัครงานกับเรา!</h2></div><div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;"><p>สวัสดีคุณ <strong>' + fullname_th + '</strong>,</p><p>เราได้รับใบสมัครงานของคุณเรียบร้อยแล้ว 📋</p><div style="background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px;"><h3>📋 ข้อมูลการสมัคร</h3><p><strong>รหัสใบสมัคร:</strong> ' + application.id + '</p><p><strong>ตำแหน่งที่สมัคร:</strong> ' + position + '</p><p><strong>วันที่สมัคร:</strong> ' + new Date().toLocaleDateString('th-TH') + '</p></div><p>เราจะติดต่อกลับภายใน 7 วันทำการ</p></div></div></body></html>';
        
        await sendEmail(email, '🎉 ยืนยันการรับใบสมัครงาน', applicantEmailHTML);
        
        const adminEmailHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif;"><h1>🆕 มีใบสมัครงานใหม่!</h1><p>รหัส: ' + application.id + '</p><p>ตำแหน่ง: ' + position + '</p><p>ชื่อ: ' + fullname_th + '</p><p>อีเมล: ' + email + '</p><p>โทร: ' + phone + '</p></body></html>';
        
        await sendEmail(
            process.env.ADMIN_EMAIL || 'forcon674@outlook.com',
            '🆕 ใบสมัครงานใหม่ - ' + position + ' - ' + fullname_th,
            adminEmailHTML,
            attachments
        );
        
        console.log('Emails sent successfully');
        
        res.json({
            success: true,
            message: 'ส่งใบสมัครงานสำเร็จ! เราจะติดต่อกลับภายใน 7 วันทำการ',
            application_id: application.id
        });
        
    } catch (error) {
        console.error('Error processing job application:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ====================================================
// ERROR HANDLING
// ====================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// ====================================================
// EXPORT FOR VERCEL
// ====================================================

module.exports = app;
