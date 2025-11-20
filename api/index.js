// api/index.js - MODERN BEAUTIFUL PDF DESIGN
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
// BEAUTIFUL PDF GENERATION - MODERN DESIGN
// ====================================================

async function generateJobApplicationPDF(data) {
    return new Promise(async (resolve, reject) => {
        try {
            const fonts = await downloadThaiFont();
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('SarabunBold', fonts.bold);

            // ====================================================
            // STUNNING HEADER - Full Width Design
            // ====================================================
            
            // Gradient Header Background (สีสวยๆ)
            const headerHeight = 180;
            const gradientSteps = 100;
            
            for (let i = 0; i < gradientSteps; i++) {
                const color = interpolateColor(
                    [79, 172, 254],  // #4FACFE (ฟ้าสดใส)
                    [0, 242, 254],   // #00F2FE (ฟ้าเขียว)
                    i / gradientSteps
                );
                doc.rect(0, i * (headerHeight / gradientSteps), doc.page.width, headerHeight / gradientSteps)
                   .fill(`rgb(${color[0]}, ${color[1]}, ${color[2]})`);
            }
            
            // Large Position Title
            doc.fillColor('#FFFFFF')
               .fontSize(36)
               .font('SarabunBold')
               .text(data.position, 0, 45, { 
                   align: 'center', 
                   width: doc.page.width 
               });
            
            // Applicant Name
            doc.fontSize(22)
               .font('Sarabun')
               .fillOpacity(0.95)
               .text(data.personal_info.fullname_th, 0, 95, { 
                   align: 'center', 
                   width: doc.page.width 
               });
            
            if (data.personal_info.fullname_en) {
                doc.fontSize(14)
                   .fillOpacity(0.85)
                   .text(data.personal_info.fullname_en, 0, 125, { 
                       align: 'center', 
                       width: doc.page.width 
                   });
            }
            
            // Application ID Badge
            doc.fillOpacity(1)
               .roundedRect(doc.page.width / 2 - 100, 150, 200, 25, 12)
               .fillOpacity(0.3)
               .fill('#FFFFFF');
            
            doc.fillOpacity(1)
               .fillColor('#FFFFFF')
               .fontSize(10)
               .font('Sarabun')
               .text(`รหัสใบสมัคร: ${data.id}`, 0, 157, { 
                   align: 'center', 
                   width: doc.page.width 
               });
            
            // ====================================================
            // QUICK INFO CARDS - Three Cards Layout
            // ====================================================
            
            let yPos = 210;
            const cardWidth = 160;
            const cardHeight = 75;
            const cardSpacing = 15;
            const startX = (doc.page.width - (cardWidth * 3 + cardSpacing * 2)) / 2;
            
            // Card 1: Contact Info
            drawInfoCard(doc, startX, yPos, cardWidth, cardHeight, 
                '📱 ติดต่อ', 
                [
                    data.personal_info.phone,
                    data.personal_info.line_id,
                    data.personal_info.email
                ],
                '#4FACFE'
            );
            
            // Card 2: Personal Details
            drawInfoCard(doc, startX + cardWidth + cardSpacing, yPos, cardWidth, cardHeight,
                '👤 ข้อมูลส่วนตัว',
                [
                    `${data.personal_info.gender} • ${data.personal_info.age} ปี`,
                    data.personal_info.nationality,
                    data.personal_info.religion
                ],
                '#00D2FF'
            );
            
            // Card 3: Education
            drawInfoCard(doc, startX + (cardWidth + cardSpacing) * 2, yPos, cardWidth, cardHeight,
                '🎓 การศึกษา',
                [
                    data.education.education_used,
                    `เลขบัตร: ${data.personal_info.id_card}`,
                    ''
                ],
                '#3A7BD5'
            );
            
            yPos += cardHeight + 35;
            
            // ====================================================
            // MAIN CONTENT AREA - Two Column Layout
            // ====================================================
            
            const leftColX = 50;
            const leftColWidth = 260;
            const rightColX = 330;
            const rightColWidth = 245;
            
            // LEFT COLUMN
            let leftY = yPos;
            
            // Address Section
            addSectionTitle(doc, '📍 ที่อยู่ปัจจุบัน', leftColX, leftY, '#4FACFE');
            leftY += 25;
            
            doc.fontSize(10)
               .fillColor('#2c3e50')
               .font('Sarabun')
               .text(data.personal_info.address.full, leftColX, leftY, { 
                   width: leftColWidth,
                   lineGap: 2
               });
            leftY += 22;
            
            doc.fontSize(9)
               .fillColor('#7f8c8d')
               .text(`${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}`, 
                   leftColX, leftY, { width: leftColWidth });
            leftY += 15;
            
            doc.text(`${data.personal_info.address.province} ${data.personal_info.address.zipcode}`, 
                leftColX, leftY, { width: leftColWidth });
            leftY += 35;
            
            // Education History
            addSectionTitle(doc, '🎓 ประวัติการศึกษา', leftColX, leftY, '#4FACFE');
            leftY += 30;
            
            if (data.education.high_school.school) {
                addEducationItem(doc, leftColX, leftY, leftColWidth,
                    'มัธยมศึกษา',
                    data.education.high_school.school,
                    data.education.high_school.major,
                    data.education.high_school.year
                );
                leftY += 45;
            }
            
            if (data.education.vocational.school) {
                addEducationItem(doc, leftColX, leftY, leftColWidth,
                    'ปวช./ปวส.',
                    data.education.vocational.school,
                    data.education.vocational.major,
                    data.education.vocational.year
                );
                leftY += 45;
            }
            
            if (data.education.bachelor.school) {
                addEducationItem(doc, leftColX, leftY, leftColWidth,
                    'ปริญญาตรี',
                    data.education.bachelor.school,
                    data.education.bachelor.major,
                    data.education.bachelor.year
                );
                leftY += 45;
            }
            
            if (data.education.other.school) {
                addEducationItem(doc, leftColX, leftY, leftColWidth,
                    'อื่นๆ',
                    data.education.other.school,
                    data.education.other.major,
                    data.education.other.year
                );
                leftY += 45;
            }
            
            // Additional Info
            if (leftY < 650) {
                addSectionTitle(doc, '✨ ข้อมูลเพิ่มเติม', leftColX, leftY, '#4FACFE');
                leftY += 25;
                
                if (data.additional_info.special_skills) {
                    addDetailItem(doc, leftColX, leftY, '🌟 ทักษะพิเศษ', 
                        data.additional_info.special_skills, leftColWidth);
                    leftY += 22;
                }
                
                if (data.additional_info.expected_salary) {
                    addDetailItem(doc, leftColX, leftY, '💰 เงินเดือนที่คาดหวัง', 
                        `${data.additional_info.expected_salary} บาท`, leftColWidth);
                    leftY += 22;
                }
                
                if (data.additional_info.start_date) {
                    addDetailItem(doc, leftColX, leftY, '📅 เริ่มงานได้', 
                        data.additional_info.start_date, leftColWidth);
                    leftY += 22;
                }
                
                if (data.additional_info.has_disease && data.additional_info.has_disease !== 'ไม่มี') {
                    addDetailItem(doc, leftColX, leftY, '🏥 โรคประจำตัว', 
                        data.additional_info.disease_detail || data.additional_info.has_disease, leftColWidth);
                    leftY += 22;
                }
            }
            
            // RIGHT COLUMN
            let rightY = yPos;
            
            // Work Experience
            addSectionTitle(doc, '💼 ประสบการณ์การทำงาน', rightColX, rightY, '#3A7BD5');
            rightY += 30;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    // Timeline bullet
                    doc.circle(rightColX + 5, rightY + 5, 4)
                       .fill('#3A7BD5');
                    
                    // Position
                    doc.fontSize(11)
                       .fillColor('#2c3e50')
                       .font('SarabunBold')
                       .text(work.position || 'ตำแหน่งงาน', rightColX + 18, rightY, {
                           width: rightColWidth - 18
                       });
                    rightY += 17;
                    
                    // Company
                    doc.fontSize(10)
                       .fillColor('#34495e')
                       .font('Sarabun')
                       .text(work.company, rightColX + 18, rightY, {
                           width: rightColWidth - 18
                       });
                    rightY += 16;
                    
                    // Duration
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${work.start || '-'} ถึง ${work.end || '-'}`, 
                           rightColX + 18, rightY, {
                               width: rightColWidth - 18
                           });
                    rightY += 14;
                    
                    // Reason for leaving
                    if (work.reason) {
                        doc.fontSize(8)
                           .fillColor('#95a5a6')
                           .text(`เหตุผล: ${work.reason}`, rightColX + 18, rightY, {
                               width: rightColWidth - 18
                           });
                        rightY += 14;
                    }
                    
                    rightY += 20;
                    
                    // Page break check
                    if (rightY > 700 && index < data.work_experience.length - 1) {
                        doc.addPage();
                        rightY = 60;
                        addSectionTitle(doc, '💼 ประสบการณ์การทำงาน (ต่อ)', rightColX, rightY, '#3A7BD5');
                        rightY += 30;
                    }
                });
            } else {
                doc.fontSize(10)
                   .fillColor('#95a5a6')
                   .font('Sarabun')
                   .text('ไม่มีประสบการณ์ทำงาน', rightColX + 18, rightY);
                rightY += 30;
            }
            
            // Motivation (if space available or new page)
            if (data.additional_info.motivation) {
                if (rightY > 600) {
                    doc.addPage();
                    rightY = 60;
                }
                
                addSectionTitle(doc, '💭 เหตุผลที่ต้องการร่วมงาน', rightColX, rightY, '#3A7BD5');
                rightY += 25;
                
                // Motivation box
                doc.roundedRect(rightColX - 5, rightY - 5, rightColWidth + 10, 90, 8)
                   .fillOpacity(0.05)
                   .fill('#3A7BD5');
                
                doc.fillOpacity(1)
                   .fontSize(9)
                   .fillColor('#2c3e50')
                   .font('Sarabun')
                   .text(data.additional_info.motivation, rightColX + 5, rightY + 5, {
                       width: rightColWidth - 10,
                       lineGap: 3
                   });
            }
            
            // ====================================================
            // ELEGANT FOOTER
            // ====================================================
            
            const footerY = doc.page.height - 40;
            
            // Footer line
            doc.moveTo(50, footerY - 10)
               .lineTo(doc.page.width - 50, footerY - 10)
               .strokeOpacity(0.2)
               .lineWidth(1)
               .stroke('#4FACFE');
            
            doc.strokeOpacity(1)
               .fontSize(8)
               .fillColor('#95a5a6')
               .font('Sarabun')
               .text(`สร้างโดยระบบรับสมัครงานอัตโนมัติ • วันที่: ${new Date().toLocaleDateString('th-TH')}`, 
                   0, footerY, { 
                       align: 'center',
                       width: doc.page.width
                   });
            
            doc.fontSize(7)
               .fillColor('#bdc3c7')
               .text('© 2024 Made with 💚 in Thailand', 
                   0, footerY + 15, {
                       align: 'center',
                       width: doc.page.width
                   });
            
            doc.end();
            
            // ====================================================
            // HELPER FUNCTIONS
            // ====================================================
            
            function interpolateColor(color1, color2, factor) {
                return color1.map((c, i) => Math.round(c + factor * (color2[i] - c)));
            }
            
            function drawInfoCard(doc, x, y, width, height, title, items, color) {
                // Card shadow
                doc.roundedRect(x + 2, y + 2, width, height, 8)
                   .fillOpacity(0.1)
                   .fill('#000000');
                
                // Card background
                doc.roundedRect(x, y, width, height, 8)
                   .fillOpacity(1)
                   .fill('#FFFFFF');
                
                // Card border
                doc.roundedRect(x, y, width, height, 8)
                   .strokeOpacity(0.15)
                   .lineWidth(1)
                   .stroke(color);
                
                doc.strokeOpacity(1);
                
                // Title
                doc.fontSize(10)
                   .fillColor(color)
                   .font('SarabunBold')
                   .text(title, x + 10, y + 10, { width: width - 20 });
                
                // Items
                let itemY = y + 28;
                items.forEach(item => {
                    if (item) {
                        doc.fontSize(8)
                           .fillColor('#2c3e50')
                           .font('Sarabun')
                           .text(item, x + 10, itemY, { 
                               width: width - 20,
                               ellipsis: true
                           });
                        itemY += 13;
                    }
                });
            }
            
            function addSectionTitle(doc, title, x, y, color) {
                // Accent line
                doc.roundedRect(x - 5, y, 3, 18, 1.5)
                   .fill(color);
                
                // Title
                doc.fontSize(12)
                   .fillColor('#2c3e50')
                   .font('SarabunBold')
                   .text(title, x + 5, y + 1);
            }
            
            function addEducationItem(doc, x, y, width, level, school, major, year) {
                // Level badge
                doc.roundedRect(x, y, 75, 18, 4)
                   .fillOpacity(0.1)
                   .fill('#4FACFE');
                
                doc.fillOpacity(1)
                   .fontSize(9)
                   .fillColor('#4FACFE')
                   .font('SarabunBold')
                   .text(level, x + 5, y + 4);
                
                // School
                doc.fontSize(10)
                   .fillColor('#2c3e50')
                   .font('Sarabun')
                   .text(school, x, y + 23, { width: width });
                
                // Major and year
                if (major || year) {
                    doc.fontSize(9)
                       .fillColor('#7f8c8d')
                       .text(`${major || '-'} • ${year || '-'}`, x, y + 37, { width: width });
                }
            }
            
            function addDetailItem(doc, x, y, label, value, width) {
                doc.fontSize(9)
                   .fillColor('#7f8c8d')
                   .font('Sarabun')
                   .text(label, x, y);
                
                doc.fontSize(9)
                   .fillColor('#2c3e50')
                   .text(`: ${value}`, x + doc.widthOfString(label), y, {
                       width: width - doc.widthOfString(label)
                   });
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
        
        // Generate beautiful PDF
        console.log('Generating beautiful PDF...');
        const pdfBuffer = await generateJobApplicationPDF(application);
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
                        <h1>🌟 ยืนยันการสมัครงาน</h1>
                        <h2>ขอบคุณที่สมัครงานกับเรา!</h2>
                    </div>
                    <div class="content">
                        <p>สวัสดีคุณ <strong>${fullname_th}</strong>,</p>
                        <p>เราได้รับใบสมัครงานของคุณเรียบร้อยแล้ว และกำลังพิจารณาข้อมูลของคุณอย่างละเอียด 📋</p>
                        
                        <div class="info-box">
                            <h3>📋 ข้อมูลการสมัคร</h3>
                            <p><strong>รหัสใบสมัคร:</strong> ${application.id}</p>
                            <p><strong>ตำแหน่งที่สมัคร:</strong> ${position}</p>
                            <p><strong>วันที่สมัคร:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
                        </div>
                        
                        <h3>📞 ขั้นตอนถัดไป:</h3>
                        <ol>
                            <li>ทีมงาน HR จะพิจารณาใบสมัครของคุณ (3-5 วันทำการ)</li>
                            <li>หากผ่านการพิจารณา เราจะติดต่อกลับเพื่อนัดสัมภาษณ์</li>
                            <li>กรุณาตรวจสอบอีเมลและโทรศัพท์เป็นประจำ</li>
                        </ol>
                        
                        <p style="margin-top: 25px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
                            <strong>หมายเหตุ:</strong> กรุณาเก็บรหัสใบสมัคร (${application.id}) ไว้สำหรับการติดตามผล
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2024 ระบบรับสมัครงาน<br>
                        Made with 💚 in Thailand</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await sendEmail(
            email, 
            '🎉 ยืนยันการรับใบสมัครงาน', 
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
                    <h1>🆕 มีใบสมัครงานใหม่!</h1>
                    <p>รหัสใบสมัคร: ${application.id}</p>
                </div>
                
                <div class="alert">
                    <strong>⚠️ แจ้งเตือน:</strong> มีผู้สมัครงานตำแหน่ง <strong>${position}</strong> 
                    กรุณาตรวจสอบไฟล์ PDF และรูปถ่ายที่แนบมาพร้อมอีเมลนี้
                </div>
                
                <div class="section">
                    <h2>📋 สรุปข้อมูลผู้สมัคร</h2>
                    <table>
                        <tr><td>ชื่อ-นามสกุล:</td><td>${fullname_th}</td></tr>
                        <tr><td>ตำแหน่งที่สมัคร:</td><td>${position}</td></tr>
                        <tr><td>เบอร์โทร:</td><td>${phone}</td></tr>
                        <tr><td>LINE ID:</td><td>${line_id}</td></tr>
                        <tr><td>อีเมล:</td><td>${email}</td></tr>
                        <tr><td>อายุ:</td><td>${age} ปี</td></tr>
                        <tr><td>สัญชาติ:</td><td>${nationality}</td></tr>
                        <tr><td>เชื้อชาติ:</td><td>${ethnicity}</td></tr>
                        <tr><td>ศาสนา:</td><td>${religion}</td></tr>
                        <tr><td>วุฒิการศึกษา:</td><td>${education_used}</td></tr>
                        <tr><td>เงินเดือนที่คาดหวัง:</td><td>${expected_salary ? expected_salary + ' บาท' : 'ไม่ระบุ'}</td></tr>
                        <tr><td>โรคประจำตัว:</td><td>${has_disease}${disease_detail ? ' - ' + disease_detail : ''}</td></tr>
                        <tr><td>ประวัติอาชญากรรม:</td><td>${has_criminal_record}${criminal_detail ? ' - ' + criminal_detail : ''}</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h3>🔎 ไฟล์ที่แนบมา:</h3>
                    <ul>
                        <li>✅ ใบสมัครงาน (PDF) - <strong>Job_Application_${fullname_th}_${application.id}.pdf</strong></li>
                        <li>✅ รูปถ่ายหน้าตรง - <strong>Photo_${fullname_th}_${req.files.photo[0].originalname}</strong></li>
                        ${req.files.resume ? `<li>✅ เรซูเม่ - <strong>${req.files.resume[0].originalname}</strong></li>` : '<li>❌ ไม่มีไฟล์เรซูเม่แนบมา</li>'}
                    </ul>
                </div>
                
                <div class="section">
                    <h3>⏰ ข้อมูลการส่ง:</h3>
                    <p><strong>วันที่:</strong> ${new Date().toLocaleDateString('th-TH', { 
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
                    <strong>📌 Action Required:</strong> กรุณาดาวน์โหลดและตรวจสอบไฟล์ PDF และรูปถ่ายที่แนบมา<br>
                    <em>และติดต่อผู้สมัคร ภายใน 7 วันทำการ</em>
                </p>
            </body>
            </html>
        `;
        
        console.log('Sending email to admin...');
        await sendEmail(
            process.env.ADMIN_EMAIL || 'forcon674@outlook.com',
            `🆕 ใบสมัครงานใหม่ - ${position} - ${fullname_th}`,
            adminEmailHTML,
            attachments
        );
        console.log('Email sent successfully');
        
        // Log application
        console.log('New Job Application:', application);
        
        // Return success response
        res.json({
            success: true,
            message: 'ส่งใบสมัครงานสำเร็จ! เราจะติดต่อกลับ ภายใน 7 วันทำการ',
            application_id: application.id
        });
        
    } catch (error) {
        console.error('Error processing job application:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
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
