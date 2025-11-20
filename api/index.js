// api/index.js - MODERN BEAUTIFUL PDF DESIGN (IMPROVED VERSION)
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
// BEAUTIFUL PDF GENERATION - ULTRA MODERN DESIGN
// ====================================================

async function generateJobApplicationPDF(data, photoBuffer = null) {
    return new Promise(async (resolve, reject) => {
        try {
            const fonts = await downloadThaiFont();
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 30, right: 30 } // ลด margin เพื่อใช้พื้นที่เต็มที่
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('SarabunBold', fonts.bold);

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const contentWidth = pageWidth - 60; // เหลือ margin ข้างละ 30

            // ====================================================
            // MODERN CLEAN HEADER
            // ====================================================
            
            // Clean white background with subtle accent
            doc.rect(0, 0, pageWidth, 140)
               .fill('#FFFFFF');
            
            // Modern top accent bar
            doc.rect(0, 0, pageWidth, 6)
               .fill('#00B4D8');
            
            // Position Title - ใหญ่ชัดเจน
            doc.fillColor('#1A1A1A')
               .fontSize(28)
               .font('SarabunBold')
               .text(data.position, 40, 30, { 
                   width: contentWidth - 150  // เว้นที่ให้รูปภาพ
               });
            
            // Application ID
            doc.fontSize(11)
               .fillColor('#666666')
               .font('Sarabun')
               .text(`รหัส: ${data.id}`, 40, 68);
            
            // Applicant Name - ชัดเจน
            doc.fontSize(16)
               .fillColor('#00B4D8')
               .font('SarabunBold')
               .text(data.personal_info.fullname_th, 40, 90);
            
            if (data.personal_info.fullname_en) {
                doc.fontSize(12)
                   .fillColor('#888888')
                   .font('Sarabun')
                   .text(data.personal_info.fullname_en, 40, 115);
            }

            // ====================================================
            // ADD PHOTO - RIGHT TOP CORNER
            // ====================================================
            
            if (photoBuffer) {
                try {
                    const photoX = pageWidth - 160;
                    const photoY = 25;
                    const photoWidth = 120;
                    const photoHeight = 120;
                    
                    // Photo border/frame
                    doc.roundedRect(photoX - 5, photoY - 5, photoWidth + 10, photoHeight + 10, 8)
                       .lineWidth(2)
                       .stroke('#00B4D8');
                    
                    // Insert photo
                    doc.image(photoBuffer, photoX, photoY, {
                        fit: [photoWidth, photoHeight],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (photoError) {
                    console.error('Error adding photo to PDF:', photoError);
                }
            }
            
            // Divider line
            doc.moveTo(40, 150)
               .lineTo(pageWidth - 40, 150)
               .lineWidth(2)
               .stroke('#00B4D8');
            
            // ====================================================
            // COMPACT INFO SECTION
            // ====================================================
            
            let yPos = 170;
            
            // Quick Contact Info - Horizontal layout
            const contactY = yPos;
            doc.fontSize(10)
               .fillColor('#333333')
               .font('Sarabun')
               .text(`📞 ${data.personal_info.phone}`, 40, contactY, { continued: true })
               .text(`  |  `, { continued: true })
               .text(`📧 ${data.personal_info.email}`);
            
            yPos += 18;
            
            doc.text(`LINE: ${data.personal_info.line_id}`, 40, yPos, { continued: true })
               .text(`  |  `, { continued: true })
               .text(`เพศ: ${data.personal_info.gender}`, { continued: true })
               .text(`  |  `, { continued: true })
               .text(`อายุ: ${data.personal_info.age} ปี`);
            
            yPos += 18;
            
            doc.text(`สัญชาติ: ${data.personal_info.nationality}`, 40, yPos, { continued: true })
               .text(`  |  `, { continued: true })
               .text(`เชื้อชาติ: ${data.personal_info.ethnicity}`, { continued: true })
               .text(`  |  `, { continued: true })
               .text(`ศาสนา: ${data.personal_info.religion}`);
            
            yPos += 18;
            
            doc.fontSize(9)
               .fillColor('#666666')
               .text(`บัตรประชาชน: ${data.personal_info.id_card}`, 40, yPos);
            
            yPos += 25;
            
            // ====================================================
            // TWO COLUMN LAYOUT - MAXIMIZED WIDTH
            // ====================================================
            
            const leftColX = 40;
            const leftColWidth = (contentWidth / 2) - 15;
            const rightColX = leftColX + leftColWidth + 30;
            const rightColWidth = leftColWidth;
            
            // Draw subtle column separator
            doc.moveTo(rightColX - 15, yPos)
               .lineTo(rightColX - 15, pageHeight - 60)
               .lineWidth(1)
               .strokeOpacity(0.15)
               .stroke('#00B4D8');
            doc.strokeOpacity(1);
            
            let leftY = yPos;
            let rightY = yPos;
            
            // ====================================================
            // LEFT COLUMN
            // ====================================================
            
            // Address Section
            addModernSectionTitle(doc, '📍 ที่อยู่ปัจจุบัน', leftColX, leftY);
            leftY += 22;
            
            doc.fontSize(11)
               .fillColor('#1A1A1A')
               .font('Sarabun')
               .text(data.personal_info.address.full, leftColX, leftY, { 
                   width: leftColWidth,
                   lineGap: 2
               });
            leftY += doc.heightOfString(data.personal_info.address.full, { width: leftColWidth }) + 5;
            
            doc.fontSize(10)
               .fillColor('#555555')
               .text(`${data.personal_info.address.subdistrict} ${data.personal_info.address.district}`, 
                   leftColX, leftY, { width: leftColWidth });
            leftY += 15;
            
            doc.text(`${data.personal_info.address.province} ${data.personal_info.address.zipcode}`, 
                leftColX, leftY, { width: leftColWidth });
            leftY += 28;
            
            // Education History
            addModernSectionTitle(doc, '🎓 ประวัติการศึกษา', leftColX, leftY);
            leftY += 22;
            
            // Education level used
            doc.fontSize(10)
               .fillColor('#00B4D8')
               .font('SarabunBold')
               .text(`ระดับที่ใช้สมัคร: ${data.education.education_used}`, leftColX, leftY);
            leftY += 20;
            
            if (data.education.high_school.school) {
                addCompactEducationItem(doc, leftColX, leftY, leftColWidth,
                    'มัธยมศึกษา',
                    data.education.high_school.school,
                    data.education.high_school.major,
                    data.education.high_school.year
                );
                leftY += 38;
            }
            
            if (data.education.vocational.school) {
                addCompactEducationItem(doc, leftColX, leftY, leftColWidth,
                    'อาชีวศึกษา',
                    data.education.vocational.school,
                    data.education.vocational.major,
                    data.education.vocational.year
                );
                leftY += 38;
            }
            
            if (data.education.bachelor.school) {
                addCompactEducationItem(doc, leftColX, leftY, leftColWidth,
                    'ปริญญาตรี',
                    data.education.bachelor.school,
                    data.education.bachelor.major,
                    data.education.bachelor.year
                );
                leftY += 38;
            }
            
            if (data.education.other.school) {
                addCompactEducationItem(doc, leftColX, leftY, leftColWidth,
                    'อื่นๆ',
                    data.education.other.school,
                    data.education.other.major,
                    data.education.other.year
                );
                leftY += 38;
            }
            
            leftY += 10;
            
            // Additional Info
            addModernSectionTitle(doc, '💼 ข้อมูลเพิ่มเติม', leftColX, leftY);
            leftY += 22;
            
            if (data.additional_info.special_skills) {
                addCompactDetailRow(doc, leftColX, leftY, 'ความสามารถพิเศษ:', 
                    data.additional_info.special_skills, leftColWidth);
                leftY += 18;
            }
            
            if (data.additional_info.expected_salary) {
                addCompactDetailRow(doc, leftColX, leftY, 'เงินเดือนที่คาดหวัง:', 
                    `${data.additional_info.expected_salary} บาท`, leftColWidth);
                leftY += 18;
            }
            
            if (data.additional_info.start_date) {
                addCompactDetailRow(doc, leftColX, leftY, 'วันที่สามารถเริ่มงาน:', 
                    data.additional_info.start_date, leftColWidth);
                leftY += 18;
            }
            
            if (data.additional_info.has_disease) {
                addCompactDetailRow(doc, leftColX, leftY, 'โรคประจำตัว:', 
                    data.additional_info.disease_detail || data.additional_info.has_disease, leftColWidth);
                leftY += 18;
            }
            
            if (data.additional_info.has_criminal_record) {
                addCompactDetailRow(doc, leftColX, leftY, 'ประวัติอาชญากรรม:', 
                    data.additional_info.criminal_detail || data.additional_info.has_criminal_record, leftColWidth);
                leftY += 18;
            }
            
            // ====================================================
            // RIGHT COLUMN
            // ====================================================
            
            // Work Experience
            addModernSectionTitle(doc, '💼 ประวัติการทำงาน', rightColX, rightY);
            rightY += 22;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    // Timeline dot
                    doc.circle(rightColX + 6, rightY + 6, 5)
                       .fillAndStroke('#00B4D8', '#00B4D8');
                    
                    // Position - ขนาดใหญ่ชัดเจน
                    doc.fontSize(12)
                       .fillColor('#1A1A1A')
                       .font('SarabunBold')
                       .text(work.position || 'ไม่ระบุตำแหน่ง', rightColX + 20, rightY, {
                           width: rightColWidth - 20
                       });
                    rightY += 18;
                    
                    // Company
                    doc.fontSize(11)
                       .fillColor('#333333')
                       .font('Sarabun')
                       .text(work.company, rightColX + 20, rightY, {
                           width: rightColWidth - 20
                       });
                    rightY += 16;
                    
                    // Duration
                    doc.fontSize(10)
                       .fillColor('#666666')
                       .text(`${work.start || '-'} ถึง ${work.end || '-'}`, 
                           rightColX + 20, rightY, {
                               width: rightColWidth - 20
                           });
                    rightY += 14;
                    
                    // Reason
                    if (work.reason) {
                        doc.fontSize(9)
                           .fillColor('#888888')
                           .text(`เหตุผลที่ออก: ${work.reason}`, rightColX + 20, rightY, {
                               width: rightColWidth - 20
                           });
                        rightY += 14;
                    }
                    
                    rightY += 16;
                });
            } else {
                doc.fontSize(11)
                   .fillColor('#999999')
                   .font('Sarabun')
                   .text('ไม่มีประสบการณ์ทำงาน', rightColX + 20, rightY);
                rightY += 25;
            }
            
            // Motivation
            if (data.additional_info.motivation) {
                rightY += 10;
                addModernSectionTitle(doc, '✨ แรงจูงใจในการสมัครงาน', rightColX, rightY);
                rightY += 22;
                
                // Clean motivation box
                doc.roundedRect(rightColX, rightY, rightColWidth, 80, 6)
                   .fillOpacity(0.05)
                   .fill('#00B4D8');
                
                doc.fillOpacity(1)
                   .fontSize(10)
                   .fillColor('#1A1A1A')
                   .font('Sarabun')
                   .text(data.additional_info.motivation, rightColX + 12, rightY + 12, {
                       width: rightColWidth - 24,
                       lineGap: 3
                   });
            }
            
            // ====================================================
            // CLEAN FOOTER
            // ====================================================
            
            const footerY = pageHeight - 45;
            
            // Footer line
            doc.moveTo(40, footerY - 5)
               .lineTo(pageWidth - 40, footerY - 5)
               .lineWidth(1)
               .strokeOpacity(0.2)
               .stroke('#00B4D8');
            
            doc.strokeOpacity(1)
               .fontSize(9)
               .fillColor('#888888')
               .font('Sarabun')
               .text(`วันที่ส่งใบสมัคร: ${new Date().toLocaleDateString('th-TH', {
                   year: 'numeric',
                   month: 'long', 
                   day: 'numeric'
               })}`, 40, footerY + 5);
            
            doc.fontSize(8)
               .fillColor('#AAAAAA')
               .text('Made with ❤️ in Thailand', pageWidth - 200, footerY + 5, {
                   width: 160,
                   align: 'right'
               });
            
            doc.end();
            
            // ====================================================
            // HELPER FUNCTIONS
            // ====================================================
            
            function addModernSectionTitle(doc, title, x, y) {
                doc.fontSize(13)
                   .fillColor('#00B4D8')
                   .font('SarabunBold')
                   .text(title, x, y);
            }
            
            function addCompactEducationItem(doc, x, y, width, level, school, major, year) {
                // Level badge
                doc.fontSize(9)
                   .fillColor('#FFFFFF')
                   .font('SarabunBold');
                
                const badgeWidth = doc.widthOfString(level) + 16;
                doc.roundedRect(x, y, badgeWidth, 18, 4)
                   .fill('#00B4D8');
                
                doc.fillColor('#FFFFFF')
                   .text(level, x + 8, y + 4);
                
                // School - ขนาดใหญ่ขึ้น
                doc.fontSize(11)
                   .fillColor('#1A1A1A')
                   .font('Sarabun')
                   .text(school, x, y + 23, { width: width });
                
                // Major and year
                if (major || year) {
                    const details = [];
                    if (major) details.push(major);
                    if (year) details.push(`ปี ${year}`);
                    
                    doc.fontSize(10)
                       .fillColor('#666666')
                       .text(details.join(' • '), x, y + 36, { width: width });
                }
            }
            
            function addCompactDetailRow(doc, x, y, label, value, width) {
                doc.fontSize(10)
                   .fillColor('#555555')
                   .font('SarabunBold')
                   .text(label, x, y, { continued: true, width: width });
                
                doc.font('Sarabun')
                   .fillColor('#1A1A1A')
                   .text(` ${value}`, { width: width });
            }
            
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
                message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
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
                message: 'กรุณาอัพโหลดรูปถ่าย'
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
        
        // Get photo buffer
        const photoBuffer = req.files.photo[0].buffer;
        
        // Generate beautiful PDF with photo
        console.log('Generating beautiful PDF with photo...');
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
                    .header { background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #00B4D8; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>ขอบคุณสำหรับใบสมัครงาน</h1>
                        <h2>เราได้รับใบสมัครของคุณแล้ว!</h2>
                    </div>
                    <div class="content">
                        <p>เรียน <strong>${fullname_th}</strong>,</p>
                        <p>ขอบคุณที่ให้ความสนใจในตำแหน่งงานกับเรา เราได้รับใบสมัครของคุณเรียบร้อยแล้ว</p>
                        
                        <div class="info-box">
                            <h3>ข้อมูลการสมัครงานของคุณ</h3>
                            <p><strong>รหัสใบสมัคร:</strong> ${application.id}</p>
                            <p><strong>ตำแหน่งที่สมัคร:</strong> ${position}</p>
                            <p><strong>วันที่ส่งใบสมัคร:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
                        </div>
                        
                        <h3>ขั้นตอนต่อไป:</h3>
                        <ol>
                            <li>ทีม HR จะตรวจสอบใบสมัครของคุณ (3-5 วันทำการ)</li>
                            <li>หากผ่านการพิจารณาเบื้องต้น เราจะติดต่อกลับเพื่อนัดสัมภาษณ์</li>
                            <li>กรุณาเก็บรหัสใบสมัครไว้สำหรับการติดตาม</li>
                        </ol>
                        
                        <p style="margin-top: 25px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
                            <strong>หมายเหตุ:</strong> หากมีคำถาม กรุณาระบุรหัสใบสมัคร (${application.id}) เพื่อความรวดเร็ว
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2024 บริษัทของเรา<br>
                        Made with ❤️ in Thailand</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await sendEmail(
            email, 
            'ยืนยันการรับใบสมัครงาน', 
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
                    .header { background: #00B4D8; color: white; padding: 20px; }
                    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    table td { padding: 8px; border-bottom: 1px solid #ddd; }
                    table td:first-child { font-weight: bold; width: 200px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>มีใบสมัครงานใหม่เข้ามา!</h1>
                    <p>รหัสใบสมัคร: ${application.id}</p>
                </div>
                
                <div class="alert">
                    <strong>แจ้งเตือนสำคัญ:</strong> มีผู้สมัครงานตำแหน่ง <strong>${position}</strong> ใหม่
                    กรุณาตรวจสอบเอกสาร PDF และรูปถ่ายที่แนบมาด้วย
                </div>
                
                <div class="section">
                    <h2>ข้อมูลผู้สมัคร</h2>
                    <table>
                        <tr><td>ชื่อ-นามสกุล:</td><td>${fullname_th}</td></tr>
                        <tr><td>ตำแหน่งที่สมัคร:</td><td>${position}</td></tr>
                        <tr><td>เบอร์โทรศัพท์:</td><td>${phone}</td></tr>
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
                    <h3>ไฟล์แนบทั้งหมด:</h3>
                    <ul>
                        <li>ใบสมัครงาน (PDF) - <strong>Job_Application_${fullname_th}_${application.id}.pdf</strong></li>
                        <li>รูปถ่าย - <strong>Photo_${fullname_th}_${req.files.photo[0].originalname}</strong></li>
                        ${req.files.resume ? `<li>เรซูเม่ - <strong>${req.files.resume[0].originalname}</strong></li>` : '<li>ไม่มีเรซูเม่แนบ</li>'}
                    </ul>
                </div>
                
                <div class="section">
                    <h3>สถานะใบสมัคร:</h3>
                    <p><strong>วันที่สมัคร:</strong> ${new Date().toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                    <p><strong>สถานะ:</strong> <span style="color: #ffc107;">รอการพิจารณา</span></p>
                </div>
                
                <hr style="margin: 30px 0;">
                <p style="text-align: center; color: #666;">
                    <strong>⚠️ Action Required:</strong> กรุณาตรวจสอบเอกสาร PDF และติดต่อผู้สมัครภายใน 7 วันทำการ<br>
                    <em>อีเมลนี้ส่งอัตโนมัติจากระบบรับสมัครงาน</em>
                </p>
            </body>
            </html>
        `;
        
        console.log('Sending email to admin...');
        await sendEmail(
            process.env.ADMIN_EMAIL || 'forcon674@outlook.com',
            `ใบสมัครงานใหม่ - ${position} - ${fullname_th}`,
            adminEmailHTML,
            attachments
        );
        console.log('Email sent successfully');
        
        // Log application
        console.log('New Job Application:', application);
        
        // Return success response
        res.json({
            success: true,
            message: 'ส่งใบสมัครงานสำเร็จ! กรุณาตรวจสอบอีเมลของคุณภายใน 7 วันทำการ',
            application_id: application.id
        });
        
    } catch (error) {
        console.error('Error processing job application:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่งใบสมัคร กรุณาลองใหม่อีกครั้ง'
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
