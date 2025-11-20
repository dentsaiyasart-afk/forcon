// api/index.js - CLEAN PROFESSIONAL PDF DESIGN
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
// DOWNLOAD THAI FONTS
// ====================================================

let thaiFont = null;
let thaiFontBold = null;

async function downloadThaiFont() {
    if (thaiFont) return { regular: thaiFont, bold: thaiFontBold };
    
    try {
        console.log('Downloading Thai fonts...');
        
        const responseRegular = await axios.get(
            'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Regular.ttf',
            { responseType: 'arraybuffer' }
        );
        thaiFont = Buffer.from(responseRegular.data);
        
        try {
            const responseBold = await axios.get(
                'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Bold.ttf',
                { responseType: 'arraybuffer' }
            );
            thaiFontBold = Buffer.from(responseBold.data);
        } catch (boldError) {
            console.log('Bold font not available, using regular');
            thaiFontBold = thaiFont;
        }
        
        console.log('Thai fonts downloaded successfully');
        return { regular: thaiFont, bold: thaiFontBold };
        
    } catch (error) {
        console.error('Error downloading Thai font:', error);
        
        try {
            const fallback = await axios.get(
                'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf',
                { responseType: 'arraybuffer' }
            );
            thaiFont = Buffer.from(fallback.data);
            thaiFontBold = thaiFont;
            console.log('Thai font downloaded from fallback source');
            return { regular: thaiFont, bold: thaiFontBold };
        } catch (fallbackError) {
            console.error('Fallback font download failed:', fallbackError);
            throw new Error('Cannot download Thai font');
        }
    }
}

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
// CLEAN PROFESSIONAL PDF GENERATION
// ====================================================

async function generateJobApplicationPDF(data, photoBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const fonts = await downloadThaiFont();
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 30, right: 30 }
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('SarabunBold', fonts.bold);

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = 30;
            const contentWidth = pageWidth - (margin * 2);
            
            let yPos = margin;

            // ====================================================
            // HEADER WITH PHOTO
            // ====================================================
            
            // Add Photo on top right
            if (photoBuffer) {
                try {
                    const photoSize = 80;
                    const photoX = pageWidth - margin - photoSize;
                    const photoY = yPos;
                    doc.image(photoBuffer, photoX, photoY, {
                        width: photoSize,
                        height: photoSize,
                        align: 'right'
                    });
                } catch (photoError) {
                    console.error('Error embedding photo:', photoError);
                }
            }
            
            // Position title
            doc.font('SarabunBold')
               .fontSize(24)
               .fillColor('#1a1a1a')
               .text(data.position, margin, yPos, { 
                   width: contentWidth - 90,
                   align: 'left'
               });
            yPos += 30;
            
            // Applicant name
            doc.font('SarabunBold')
               .fontSize(16)
               .fillColor('#2c3e50')
               .text(data.personal_info.fullname_th, margin, yPos, { 
                   width: contentWidth - 90
               });
            yPos += 20;
            
            if (data.personal_info.fullname_en) {
                doc.font('Sarabun')
                   .fontSize(12)
                   .fillColor('#7f8c8d')
                   .text(data.personal_info.fullname_en, margin, yPos, { 
                       width: contentWidth - 90
                   });
                yPos += 18;
            }
            
            // Application ID
            doc.font('Sarabun')
               .fontSize(10)
               .fillColor('#95a5a6')
               .text(`รหัสใบสมัคร: ${data.id}`, margin, yPos);
            yPos += 25;
            
            // Divider line
            doc.moveTo(margin, yPos)
               .lineTo(pageWidth - margin, yPos)
               .lineWidth(1)
               .stroke('#e0e0e0');
            yPos += 20;
            
            // ====================================================
            // QUICK INFO SECTION - Full Width
            // ====================================================
            
            const colWidth = contentWidth / 3 - 10;
            
            // Column 1: Contact
            let col1Y = yPos;
            doc.font('SarabunBold')
               .fontSize(11)
               .fillColor('#2c3e50')
               .text('ข้อมูลติดต่อ', margin, col1Y);
            col1Y += 15;
            
            doc.font('Sarabun')
               .fontSize(10)
               .fillColor('#34495e')
               .text(data.personal_info.phone, margin, col1Y);
            col1Y += 13;
            doc.text(data.personal_info.line_id, margin, col1Y);
            col1Y += 13;
            doc.text(data.personal_info.email, margin, col1Y, { width: colWidth });
            
            // Column 2: Personal
            let col2Y = yPos;
            const col2X = margin + colWidth + 15;
            doc.font('SarabunBold')
               .fontSize(11)
               .fillColor('#2c3e50')
               .text('ข้อมูลส่วนตัว', col2X, col2Y);
            col2Y += 15;
            
            doc.font('Sarabun')
               .fontSize(10)
               .fillColor('#34495e')
               .text(`${data.personal_info.gender}  อายุ ${data.personal_info.age} ปี`, col2X, col2Y);
            col2Y += 13;
            doc.text(data.personal_info.nationality, col2X, col2Y);
            col2Y += 13;
            doc.text(data.personal_info.religion, col2X, col2Y);
            
            // Column 3: Education & ID
            let col3Y = yPos;
            const col3X = margin + (colWidth + 15) * 2;
            doc.font('SarabunBold')
               .fontSize(11)
               .fillColor('#2c3e50')
               .text('การศึกษา', col3X, col3Y);
            col3Y += 15;
            
            doc.font('Sarabun')
               .fontSize(10)
               .fillColor('#34495e')
               .text(data.education.education_used, col3X, col3Y, { width: colWidth });
            col3Y += 13;
            doc.fontSize(9)
               .fillColor('#7f8c8d')
               .text(`บัตรปชช: ${data.personal_info.id_card}`, col3X, col3Y, { width: colWidth });
            
            yPos += 60;
            
            // Divider line
            doc.moveTo(margin, yPos)
               .lineTo(pageWidth - margin, yPos)
               .lineWidth(1)
               .stroke('#e0e0e0');
            yPos += 20;
            
            // ====================================================
            // TWO COLUMN LAYOUT - Full Width
            // ====================================================
            
            const leftColX = margin;
            const leftColWidth = contentWidth * 0.48;
            const rightColX = margin + leftColWidth + 20;
            const rightColWidth = contentWidth * 0.48;
            
            // LEFT COLUMN
            let leftY = yPos;
            
            // Address
            doc.font('SarabunBold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('ที่อยู่', leftColX, leftY);
            leftY += 18;
            
            doc.font('Sarabun')
               .fontSize(10)
               .fillColor('#34495e')
               .text(data.personal_info.address.full, leftColX, leftY, { 
                   width: leftColWidth,
                   lineGap: 2
               });
            leftY += doc.heightOfString(data.personal_info.address.full, { width: leftColWidth, lineGap: 2 }) + 5;
            
            doc.fontSize(9)
               .fillColor('#7f8c8d')
               .text(`${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}`, 
                   leftColX, leftY, { width: leftColWidth });
            leftY += 12;
            
            doc.text(`${data.personal_info.address.province} ${data.personal_info.address.zipcode}`, 
                leftColX, leftY, { width: leftColWidth });
            leftY += 25;
            
            // Education History
            doc.font('SarabunBold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('ประวัติการศึกษา', leftColX, leftY);
            leftY += 18;
            
            if (data.education.high_school.school) {
                doc.font('SarabunBold')
                   .fontSize(10)
                   .fillColor('#4FACFE')
                   .text('มัธยมศึกษา', leftColX, leftY);
                leftY += 14;
                
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#34495e')
                   .text(data.education.high_school.school, leftColX, leftY, { width: leftColWidth });
                leftY += 12;
                
                if (data.education.high_school.major || data.education.high_school.year) {
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${data.education.high_school.major || '-'}  ปีที่จบ ${data.education.high_school.year || '-'}`, 
                           leftColX, leftY, { width: leftColWidth });
                    leftY += 12;
                }
                leftY += 8;
            }
            
            if (data.education.vocational.school) {
                doc.font('SarabunBold')
                   .fontSize(10)
                   .fillColor('#4FACFE')
                   .text('ปวช./ปวส.', leftColX, leftY);
                leftY += 14;
                
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#34495e')
                   .text(data.education.vocational.school, leftColX, leftY, { width: leftColWidth });
                leftY += 12;
                
                if (data.education.vocational.major || data.education.vocational.year) {
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${data.education.vocational.major || '-'}  ปีที่จบ ${data.education.vocational.year || '-'}`, 
                           leftColX, leftY, { width: leftColWidth });
                    leftY += 12;
                }
                leftY += 8;
            }
            
            if (data.education.bachelor.school) {
                doc.font('SarabunBold')
                   .fontSize(10)
                   .fillColor('#4FACFE')
                   .text('ปริญญาตรี', leftColX, leftY);
                leftY += 14;
                
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#34495e')
                   .text(data.education.bachelor.school, leftColX, leftY, { width: leftColWidth });
                leftY += 12;
                
                if (data.education.bachelor.major || data.education.bachelor.year) {
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${data.education.bachelor.major || '-'}  ปีที่จบ ${data.education.bachelor.year || '-'}`, 
                           leftColX, leftY, { width: leftColWidth });
                    leftY += 12;
                }
                leftY += 8;
            }
            
            if (data.education.other.school) {
                doc.font('SarabunBold')
                   .fontSize(10)
                   .fillColor('#4FACFE')
                   .text('อื่นๆ', leftColX, leftY);
                leftY += 14;
                
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#34495e')
                   .text(data.education.other.school, leftColX, leftY, { width: leftColWidth });
                leftY += 12;
                
                if (data.education.other.major || data.education.other.year) {
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${data.education.other.major || '-'}  ปีที่จบ ${data.education.other.year || '-'}`, 
                           leftColX, leftY, { width: leftColWidth });
                    leftY += 12;
                }
                leftY += 8;
            }
            
            leftY += 10;
            
            // Additional Info
            doc.font('SarabunBold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('ข้อมูลเพิ่มเติม', leftColX, leftY);
            leftY += 18;
            
            if (data.additional_info.special_skills) {
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#34495e')
                   .text(`ความสามารถพิเศษ: ${data.additional_info.special_skills}`, 
                       leftColX, leftY, { width: leftColWidth, lineGap: 2 });
                leftY += doc.heightOfString(`ความสามารถพิเศษ: ${data.additional_info.special_skills}`, 
                    { width: leftColWidth, lineGap: 2 }) + 8;
            }
            
            if (data.additional_info.expected_salary) {
                doc.text(`เงินเดือนที่คาดหวัง: ${data.additional_info.expected_salary} บาท`, 
                    leftColX, leftY, { width: leftColWidth });
                leftY += 13;
            }
            
            if (data.additional_info.start_date) {
                doc.text(`วันที่สามารถเริ่มงาน: ${data.additional_info.start_date}`, 
                    leftColX, leftY, { width: leftColWidth });
                leftY += 13;
            }
            
            if (data.additional_info.has_disease && data.additional_info.has_disease !== 'ไม่มี') {
                doc.text(`โรคประจำตัว: ${data.additional_info.disease_detail || data.additional_info.has_disease}`, 
                    leftColX, leftY, { width: leftColWidth, lineGap: 2 });
                leftY += doc.heightOfString(`โรคประจำตัว: ${data.additional_info.disease_detail || data.additional_info.has_disease}`, 
                    { width: leftColWidth, lineGap: 2 }) + 8;
            }
            
            // RIGHT COLUMN
            let rightY = yPos;
            
            // Work Experience
            doc.font('SarabunBold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('ประสบการณ์ทำงาน', rightColX, rightY);
            rightY += 18;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work) => {
                    // Position
                    doc.font('SarabunBold')
                       .fontSize(11)
                       .fillColor('#2c3e50')
                       .text(work.position || 'ไม่ระบุตำแหน่ง', rightColX, rightY, {
                           width: rightColWidth
                       });
                    rightY += 14;
                    
                    // Company
                    doc.font('Sarabun')
                       .fontSize(10)
                       .fillColor('#34495e')
                       .text(work.company, rightColX, rightY, {
                           width: rightColWidth
                       });
                    rightY += 12;
                    
                    // Duration
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${work.start || '-'} ถึง ${work.end || '-'}`, 
                           rightColX, rightY, {
                               width: rightColWidth
                           });
                    rightY += 12;
                    
                    // Reason
                    if (work.reason) {
                        doc.fontSize(9)
                           .fillColor('#95a5a6')
                           .text(`เหตุผลที่ออก: ${work.reason}`, rightColX, rightY, {
                               width: rightColWidth,
                               lineGap: 1
                           });
                        rightY += doc.heightOfString(`เหตุผลที่ออก: ${work.reason}`, 
                            { width: rightColWidth, lineGap: 1 }) + 3;
                    }
                    
                    rightY += 12;
                });
            } else {
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#95a5a6')
                   .text('ไม่มีประสบการณ์ทำงาน', rightColX, rightY);
                rightY += 25;
            }
            
            rightY += 10;
            
            // Motivation
            if (data.additional_info.motivation) {
                doc.font('SarabunBold')
                   .fontSize(12)
                   .fillColor('#2c3e50')
                   .text('เหตุผลที่สมัคร', rightColX, rightY);
                rightY += 18;
                
                doc.font('Sarabun')
                   .fontSize(10)
                   .fillColor('#34495e')
                   .text(data.additional_info.motivation, rightColX, rightY, {
                       width: rightColWidth,
                       lineGap: 3,
                       align: 'left'
                   });
            }
            
            // ====================================================
            // FOOTER
            // ====================================================
            
            const footerY = pageHeight - 50;
            
            doc.moveTo(margin, footerY)
               .lineTo(pageWidth - margin, footerY)
               .lineWidth(0.5)
               .stroke('#e0e0e0');
            
            doc.font('Sarabun')
               .fontSize(8)
               .fillColor('#95a5a6')
               .text(`วันที่สมัคร: ${new Date().toLocaleDateString('th-TH')}`, 
                   margin, footerY + 10, { 
                       width: contentWidth,
                       align: 'center'
                   });
            
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
}

// ====================================================
// HEALTH CHECK ENDPOINT
// ====================================================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Job Application API is running on Vercel',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'Job Application API',
        endpoints: [
            'GET  /api/health',
            'POST /api/job-application'
        ]
    });
});

// ====================================================
// JOB APPLICATION ENDPOINT
// ====================================================

app.post('/api/job-application', upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            position,
            fullname_th,
            fullname_en,
            gender,
            birthdate,
            age,
            nationality,
            ethnicity,
            religion,
            id_card,
            phone,
            line_id,
            email,
            address,
            subdistrict,
            district,
            province,
            zipcode,
            edu_high_school,
            edu_high_major,
            edu_high_year,
            edu_vocational,
            edu_vocational_major,
            edu_vocational_year,
            edu_bachelor,
            edu_bachelor_major,
            edu_bachelor_year,
            edu_other,
            edu_other_major,
            edu_other_year,
            education_used,
            work1_company,
            work1_position,
            work1_start,
            work1_end,
            work1_reason,
            work2_company,
            work2_position,
            work2_start,
            work2_end,
            work2_reason,
            work3_company,
            work3_position,
            work3_start,
            work3_end,
            work3_reason,
            has_disease,
            disease_detail,
            has_criminal_record,
            criminal_detail,
            special_skills,
            expected_salary,
            start_date,
            motivation
        } = req.body;
        
        // Validation
        if (!position || !fullname_th || !gender || !birthdate || !age || !nationality || !ethnicity || !religion || !id_card || !phone || !line_id || !email || !education_used) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        const idCardDigits = id_card.replace(/\D/g, '');
        if (idCardDigits.length !== 13) {
            return res.status(400).json({
                success: false,
                message: 'เลขบัตรประชาชนต้องมี 13 หลัก'
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
                message: 'กรุณาอัปโหลดรูปถ่าย'
            });
        }
        
        // Create application object
        const application = {
            id: `APP${Date.now()}`,
            position,
            personal_info: {
                fullname_th,
                fullname_en,
                gender,
                birthdate,
                age,
                nationality,
                ethnicity,
                religion,
                id_card: idCardDigits,
                phone,
                line_id,
                email,
                address: {
                    full: address,
                    subdistrict,
                    district,
                    province,
                    zipcode
                }
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
                has_disease,
                disease_detail,
                has_criminal_record,
                criminal_detail,
                special_skills,
                expected_salary,
                start_date,
                motivation
            },
            submitted_at: new Date().toISOString(),
            status: 'pending'
        };
        
        // Generate clean PDF with photo
        console.log('Generating clean professional PDF...');
        const photoBuffer = req.files.photo[0].buffer;
        const pdfBuffer = await generateJobApplicationPDF(application, photoBuffer);
        console.log('PDF generated successfully');
        
        // Prepare attachments
        const attachments = [
            {
                filename: `Job_Application_${fullname_th}_${application.id}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];
        
        // Add photo
        if (req.files.photo && req.files.photo[0]) {
            attachments.push({
                filename: `Photo_${fullname_th}_${req.files.photo[0].originalname}`,
                content: req.files.photo[0].buffer,
                contentType: req.files.photo[0].mimetype
            });
        }

        // Add resume if uploaded
        if (req.files.resume && req.files.resume[0]) {
            attachments.push({
                filename: req.files.resume[0].originalname,
                content: req.files.resume[0].buffer,
                contentType: req.files.resume[0].mimetype
            });
        }
        
        // Send confirmation email to applicant
        const applicantEmailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4FACFE; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>ยืนยันการสมัครงาน</h1>
                        <h2>ขอบคุณที่สมัครงานกับเรา!</h2>
                    </div>
                    <div class="content">
                        <p>เรียน คุณ<strong>${fullname_th}</strong>,</p>
                        <p>เราได้รับใบสมัครงานของคุณเรียบร้อยแล้ว</p>
                        
                        <div class="info-box">
                            <h3>รายละเอียดใบสมัคร</h3>
                            <p><strong>รหัสใบสมัคร:</strong> ${application.id}</p>
                            <p><strong>ตำแหน่งงาน:</strong> ${position}</p>
                            <p><strong>วันที่สมัคร:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
                        </div>
                        
                        <h3>ขั้นตอนต่อไป:</h3>
                        <ol>
                            <li>ทีม HR จะตรวจสอบใบสมัคร (3-5 วันทำการ)</li>
                            <li>เราจะติดต่อกลับหากผ่านการคัดเลือก</li>
                            <li>นัดสัมภาษณ์หรือแจ้งผลการพิจารณา</li>
                        </ol>
                        
                        <p style="margin-top: 25px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
                            <strong>หมายเหตุ:</strong> กรุณาเก็บรหัสใบสมัคร (${application.id}) ไว้สำหรับติดตามสถานะ
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2024 บริษัท<br>
                        Made with ❤ in Thailand</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await sendEmail(
            email, 
            'ยืนยันการสมัครงาน', 
            applicantEmailHTML
        );
        
        // Send notification email to admin with PDF
        const adminEmailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; }
                    .header { background: #4FACFE; color: white; padding: 20px; }
                    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    table td { padding: 8px; border-bottom: 1px solid #ddd; }
                    table td:first-child { font-weight: bold; width: 200px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎯 ใบสมัครงานใหม่!</h1>
                    <p>รหัสใบสมัคร: ${application.id}</p>
                </div>
                
                <div class="alert">
                    <strong>⚡ แจ้งเตือนด่วน:</strong> มีผู้สมัครตำแหน่ง <strong>${position}</strong> 
                    ไฟล์ PDF แนบมาพร้อมอีเมล
                </div>
                
                <div class="section">
                    <h2>📋 สรุปข้อมูล</h2>
                    <table>
                        <tr><td>ชื่อ-นามสกุล:</td><td>${fullname_th}</td></tr>
                        <tr><td>ตำแหน่ง:</td><td>${position}</td></tr>
                        <tr><td>เบอร์โทร:</td><td>${phone}</td></tr>
                        <tr><td>LINE ID:</td><td>${line_id}</td></tr>
                        <tr><td>อีเมล:</td><td>${email}</td></tr>
                        <tr><td>อายุ:</td><td>${age} ปี</td></tr>
                        <tr><td>สัญชาติ:</td><td>${nationality}</td></tr>
                        <tr><td>เชื้อชาติ:</td><td>${ethnicity}</td></tr>
                        <tr><td>ศาสนา:</td><td>${religion}</td></tr>
                        <tr><td>การศึกษา:</td><td>${education_used}</td></tr>
                        <tr><td>เงินเดือนที่คาดหวัง:</td><td>${expected_salary ? expected_salary + ' บาท' : 'ไม่ระบุ'}</td></tr>
                        <tr><td>โรคประจำตัว:</td><td>${has_disease}${disease_detail ? ' - ' + disease_detail : ''}</td></tr>
                        <tr><td>ประวัติอาชญากรรม:</td><td>${has_criminal_record}${criminal_detail ? ' - ' + criminal_detail : ''}</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h3>📎 ไฟล์แนบ:</h3>
                    <ul>
                        <li>✅ ใบสมัครงาน (PDF) - <strong>Job_Application_${fullname_th}_${application.id}.pdf</strong></li>
                        <li>✅ รูปถ่าย - <strong>Photo_${fullname_th}_${req.files.photo[0].originalname}</strong></li>
                        ${req.files.resume ? `<li>✅ เรซูเม่ - <strong>${req.files.resume[0].originalname}</strong></li>` : '<li>❌ ไม่มีเรซูเม่</li>'}
                    </ul>
                </div>
                
                <div class="section">
                    <h3>📊 สถานะ:</h3>
                    <p><strong>วันที่สมัคร:</strong> ${new Date().toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                    <p><strong>สถานะ:</strong> <span style="color: #ffc107;">⏳ รอการพิจารณา</span></p>
                </div>
                
                <hr style="margin: 30px 0;">
                <p style="text-align: center; color: #666;">
                    <strong>👉 Action Required:</strong> กรุณาตรวจสอบไฟล์ PDF แนบ<br>
                    <em>ติดต่อผู้สมัครภายใน 7 วันทำการ</em>
                </p>
            </body>
            </html>
        `;
        
        console.log('Sending email to admin...');
        await sendEmail(
            process.env.ADMIN_EMAIL || 'forcon674@outlook.com',
            `📩 ใบสมัครงานใหม่ - ${position} - ${fullname_th}`,
            adminEmailHTML,
            attachments
        );
        console.log('Email sent successfully');
        
        // Log application
        console.log('New Job Application:', application);
        
        // Return success response
        res.json({
            success: true,
            message: 'ส่งใบสมัครงานสำเร็จ! เราจะติดต่อกลับภายใน 7 วันทำการ',
            application_id: application.id
        });
        
    } catch (error) {
        console.error('Error processing job application:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่งใบสมัคร'
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
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// ====================================================
// EXPORT FOR VERCEL
// ====================================================

module.exports = app;
