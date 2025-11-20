// api/index.js - Beautiful PDFKit with Thai Font (IMPROVED VERSION)
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
// DOWNLOAD THAI FONT (Sarabun from Google Fonts)
// ====================================================

let thaiFont = null;
let thaiFontBold = null;

async function downloadThaiFont() {
    if (thaiFont && thaiFontBold) return { regular: thaiFont, bold: thaiFontBold };
    
    try {
        console.log('Downloading Thai fonts...');
        
        // ดาวน์โหลดฟอนต์ธรรมดา
        const regularResponse = await axios.get(
            'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Regular.ttf',
            { responseType: 'arraybuffer', timeout: 10000 }
        );
        thaiFont = Buffer.from(regularResponse.data);
        
        // ดาวน์โหลดฟอนต์ Bold
        const boldResponse = await axios.get(
            'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Bold.ttf',
            { responseType: 'arraybuffer', timeout: 10000 }
        );
        thaiFontBold = Buffer.from(boldResponse.data);
        
        console.log('Thai fonts downloaded successfully');
        return { regular: thaiFont, bold: thaiFontBold };
        
    } catch (error) {
        console.error('Error downloading Thai fonts:', error.message);
        throw new Error('Cannot download Thai fonts');
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
// BEAUTIFUL PDF GENERATION FUNCTION
// ====================================================

async function generateJobApplicationPDF(data) {
    return new Promise(async (resolve, reject) => {
        try {
            // ดาวน์โหลดฟอนต์ไทย
            const fonts = await downloadThaiFont();
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 40, right: 40 }
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // ลงทะเบียนฟอนต์ไทย
            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('Sarabun-Bold', fonts.bold);

            // สี Theme
            const primaryColor = '#667eea';
            const secondaryColor = '#764ba2';
            const textColor = '#2d3748';
            const lightBg = '#f7fafc';
            const borderColor = '#e2e8f0';

            let yPos = 40;

            // ====================================================
            // HEADER - ทำให้สวยงามมากขึ้น
            // ====================================================
            
            // Background gradient ด้านบน
            for (let i = 0; i < 80; i++) {
                const ratio = i / 80;
                const r = Math.round(102 + ratio * (118 - 102));
                const g = Math.round(126 + ratio * (75 - 126));
                const b = Math.round(234 + ratio * (162 - 234));
                
                doc.rect(0, i, doc.page.width, 1)
                   .fill(`rgb(${r}, ${g}, ${b})`);
            }
            
            // Title
            doc.fillColor('#FFFFFF')
               .font('Sarabun-Bold')
               .fontSize(26)
               .text('ใบสมัครงาน', 0, 25, { align: 'center' });
            
            doc.fontSize(12)
               .font('Sarabun')
               .text('Job Application Form', 0, 55, { align: 'center' });
            
            yPos = 100;
            
            // Application Info Bar
            doc.rect(40, yPos, doc.page.width - 80, 35)
               .fill(lightBg);
            
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
            // SECTION 1: ข้อมูลส่วนตัว
            // ====================================================
            
            addBeautifulSectionHeader(doc, 'ข้อมูลส่วนตัว', yPos);
            yPos += 35;
            
            // ตำแหน่งที่สมัคร - Highlight
            doc.rect(40, yPos - 3, doc.page.width - 80, 22)
               .fill('#edf2f7');
            
            doc.fillColor(primaryColor)
               .fontSize(11)
               .font('Sarabun-Bold')
               .text('ตำแหน่งที่สมัคร:', 50, yPos);
            
            doc.fillColor('#e53e3e')
               .fontSize(12)
               .text(data.position, 160, yPos);
            
            yPos += 30;
            
            // ข้อมูลส่วนตัว - 2 คอลัมน์
            addTwoColumnField(doc, 
                'ชื่อ-นามสกุล (ไทย):', data.personal_info.fullname_th,
                'Full Name (English):', data.personal_info.fullname_en || '-',
                yPos
            );
            yPos += 20;
            
            addTwoColumnField(doc,
                'เพศ:', data.personal_info.gender,
                'วันเกิด:', `${data.personal_info.birthdate} (${data.personal_info.age} ปี)`,
                yPos
            );
            yPos += 20;
            
            addTwoColumnField(doc,
                'สัญชาติ:', data.personal_info.nationality,
                'เชื้อชาติ:', data.personal_info.ethnicity,
                yPos
            );
            yPos += 20;
            
            addTwoColumnField(doc,
                'ศาสนา:', data.personal_info.religion,
                'เลขบัตรประชาชน:', data.personal_info.id_card,
                yPos
            );
            yPos += 20;
            
            addTwoColumnField(doc,
                'เบอร์โทร:', data.personal_info.phone,
                'LINE ID:', data.personal_info.line_id,
                yPos
            );
            yPos += 20;
            
            addSingleField(doc, 'อีเมล:', data.personal_info.email, yPos);
            yPos += 20;
            
            addSingleField(doc, 'ที่อยู่:', data.personal_info.address.full, yPos);
            yPos += 20;
            
            addSingleField(doc, 'ตำบล/อำเภอ/จังหวัด:', 
                `${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}, ${data.personal_info.address.province} ${data.personal_info.address.zipcode}`,
                yPos
            );
            yPos += 40;
            
            // Check new page
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }
            
            // ====================================================
            // SECTION 2: ประวัติการศึกษา
            // ====================================================
            
            addBeautifulSectionHeader(doc, 'ประวัติการศึกษา', yPos);
            yPos += 35;
            
            let hasEducation = false;
            
            if (data.education.high_school.school) {
                addEducationBox(doc, 'มัธยมศึกษา/เทียบเท่า', 
                    data.education.high_school.school,
                    data.education.high_school.major,
                    data.education.high_school.year,
                    yPos
                );
                yPos += 45;
                hasEducation = true;
            }
            
            if (data.education.vocational.school) {
                addEducationBox(doc, 'ปวช./ปวส.', 
                    data.education.vocational.school,
                    data.education.vocational.major,
                    data.education.vocational.year,
                    yPos
                );
                yPos += 45;
                hasEducation = true;
            }
            
            if (data.education.bachelor.school) {
                addEducationBox(doc, 'ปริญญาตรี', 
                    data.education.bachelor.school,
                    data.education.bachelor.major,
                    data.education.bachelor.year,
                    yPos
                );
                yPos += 45;
                hasEducation = true;
            }
            
            if (data.education.other.school) {
                addEducationBox(doc, 'อื่นๆ', 
                    data.education.other.school,
                    data.education.other.major,
                    data.education.other.year,
                    yPos
                );
                yPos += 45;
                hasEducation = true;
            }
            
            if (!hasEducation) {
                doc.fillColor('#a0aec0')
                   .fontSize(10)
                   .font('Sarabun')
                   .text('ไม่มีข้อมูลการศึกษา', 50, yPos);
                yPos += 20;
            }
            
            // วุฒิการศึกษาที่ใช้สมัคร
            doc.rect(40, yPos - 3, doc.page.width - 80, 22)
               .fill('#edf2f7');
            
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
            // SECTION 3: ประสบการณ์การทำงาน
            // ====================================================
            
            addBeautifulSectionHeader(doc, 'ประสบการณ์การทำงาน', yPos);
            yPos += 35;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    // Check new page
                    if (yPos > 650) {
                        doc.addPage();
                        yPos = 50;
                    }
                    
                    addWorkExperienceCard(doc, work, index + 1, yPos);
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
            // SECTION 4: ข้อมูลเพิ่มเติม
            // ====================================================
            
            addBeautifulSectionHeader(doc, 'ข้อมูลเพิ่มเติม', yPos);
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
                
                doc.rect(40, yPos - 3, doc.page.width - 80, 60)
                   .fill('#f0f4ff');
                
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
               .strokeColor(borderColor)
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
            
            function addBeautifulSectionHeader(doc, title, y) {
                // Background bar
                doc.rect(40, y - 5, doc.page.width - 80, 28)
                   .fill(primaryColor);
                
                // Title
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
            
            function addTwoColumnField(doc, label1, value1, label2, value2, y) {
                const midPoint = doc.page.width / 2;
                
                // Left column
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(label1, 50, y);
                
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(value1 || '-', 150, y, { width: midPoint - 160 });
                
                // Right column
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(label2, midPoint + 10, y);
                
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(value2 || '-', midPoint + 110, y, { width: midPoint - 120 });
            }
            
            function addEducationBox(doc, level, school, major, year, y) {
                // Box with border
                doc.roundedRect(40, y - 3, doc.page.width - 80, 38, 3)
                   .fillAndStroke('#fafafa', borderColor);
                
                // Level badge
                doc.rect(50, y + 5, 80, 18)
                   .fill('#e6f0ff');
                
                doc.fillColor(primaryColor)
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text(level, 55, y + 9);
                
                // School info
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(school, 140, y + 5);
                
                doc.fillColor('#718096')
                   .fontSize(9)
                   .text(`${major || '-'} | ${year || '-'}`, 140, y + 20);
            }
            
            function addWorkExperienceCard(doc, work, number, y) {
                // Card with shadow effect
                doc.roundedRect(40, y, doc.page.width - 80, 100, 5)
                   .fillAndStroke('#ffffff', borderColor);
                
                doc.roundedRect(41, y + 1, doc.page.width - 82, 98, 5)
                   .fill('#fafafa');
                
                // Header
                doc.rect(40, y, doc.page.width - 80, 25)
                   .fill('#f0f4ff');
                
                doc.fillColor(primaryColor)
                   .fontSize(11)
                   .font('Sarabun-Bold')
                   .text(`ประสบการณ์ที่ ${number}`, 50, y + 7);
                
                // Content
                y += 32;
                
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text('บริษัท:', 50, y);
                
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(work.company, 110, y);
                
                y += 16;
                
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text('ตำแหน่ง:', 50, y);
                
                doc.fillColor(textColor)
                   .fontSize(10)
                   .font('Sarabun')
                   .text(work.position || '-', 110, y);
                
                y += 16;
                
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text('ระยะเวลา:', 50, y);
                
                doc.fillColor(textColor)
                   .fontSize(9)
                   .font('Sarabun')
                   .text(`${work.start || '-'} ถึง ${work.end || '-'}`, 110, y);
                
                y += 16;
                
                doc.fillColor('#4a5568')
                   .fontSize(9)
                   .font('Sarabun-Bold')
                   .text('เหตุผล:', 50, y);
                
                doc.fillColor(textColor)
                   .fontSize(9)
                   .font('Sarabun')
                   .text(work.reason || '-', 110, y, { width: doc.page.width - 150 });
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
        message: 'Job Application API is running',
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
        
        // Send emails (same as before)
        await sendEmail(email, '🎉 ยืนยันการรับใบสมัครงาน', `...`); // Email HTML same as before
        await sendEmail(process.env.ADMIN_EMAIL || 'forcon674@outlook.com', `🆕 ใบสมัครงานใหม่ - ${position} - ${fullname_th}`, `...`, attachments);
        
        console.log('Emails sent successfully');
        
        res.json({
            success: true,
            message: 'ส่งใบสมัครงานสำเร็จ! เราจะติดต่อกลับภายใน 7 วันทำการ',
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
