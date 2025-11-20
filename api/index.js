// ====================================================
// JOB APPLICATION API (MODERN UI - ORIGINAL LOGIC)
// ====================================================

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

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
        
        // ดาวน์โหลดฟอนต์ Sarabun Regular
        const responseRegular = await axios.get(
            'https://github.com/cadsondemak/Sarabun/raw/master/fonts/ttf/Sarabun-Regular.ttf',
            { responseType: 'arraybuffer' }
        );
        thaiFont = Buffer.from(responseRegular.data);
        
        // ดาวน์โหลดฟอนต์ Sarabun Bold
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
        
        // Fallback
        try {
            const fallback = await axios.get(
                'https://fonts.gstatic.com/s/sarabun/v13/DtVjJx26TKEr37c9aAFJn2QN.ttf',
                { responseType: 'arraybuffer' }
            );
            thaiFont = Buffer.from(fallback.data);
            thaiFontBold = thaiFont;
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

function interpolateColor(color1, color2, factor) {
    if (arguments.length < 3) return color1;
    var result = color1.slice();
    for (var i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
    }
    return result;
}

// ====================================================
// PDF GENERATION FUNCTION WITH IMPROVED DESIGN
// ====================================================

async function generateJobApplicationPDF(data) {
    return new Promise(async (resolve, reject) => {
        try {
            // ดาวน์โหลดฟอนต์ไทย
            const fonts = await downloadThaiFont();
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                bufferPages: true
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // ลงทะเบียนฟอนต์ไทย
            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('SarabunBold', fonts.bold);

            // Theme Colors
            const COLORS = {
                primary: '#667eea',    // Indigo
                secondary: '#764ba2',  // Purple
                text: '#2c3e50',       // Dark Blue Grey
                label: '#7f8c8d',      // Grey
                lightBg: '#f8f9fa',
                border: '#e2e8f0'
            };

            // ====================================================
            // MODERN HEADER DESIGN
            // ====================================================
            
            // Gradient background (เรียบหรู)
            const headerHeight = 120;
            const gradientSteps = 60;
            for (let i = 0; i < gradientSteps; i++) {
                const color = interpolateColor(
                    [102, 126, 234], // #667eea
                    [118, 75, 162],  // #764ba2
                    i / gradientSteps
                );
                doc.rect(0, i * (headerHeight / gradientSteps), doc.page.width, headerHeight / gradientSteps)
                   .fill(`rgb(${color[0]}, ${color[1]}, ${color[2]})`);
            }
            
            // Header Title
            doc.fillColor('#FFFFFF')
               .fontSize(32)
               .font('SarabunBold')
               .text('ใบสมัครงาน', 0, 35, { align: 'center', width: doc.page.width });
            
            doc.fontSize(12)
               .font('Sarabun')
               .fillOpacity(0.9)
               .text('JOB APPLICATION FORM', 0, 72, { align: 'center', width: doc.page.width });
            
            // Application Info Bar (สีขาวโปร่งใส rounded)
            doc.roundedRect(60, 95, doc.page.width - 120, 35, 10)
               .fillOpacity(0.25)
               .fill('#FFFFFF');
            
            doc.fillOpacity(1)
               .fillColor('#FFFFFF')
               .fontSize(9)
               .font('Sarabun')
               .text(`รหัสใบสมัคร: ${data.id}`, 75, 105);
            
            doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`, doc.page.width - 220, 105);
            
            // Position Badge (highlight)
            const positionText = `${data.position}`;
            doc.fontSize(13).font('SarabunBold');
            const positionWidth = doc.widthOfString(positionText) + 40;
            const badgeX = (doc.page.width - positionWidth) / 2;
            
            // Drop Shadow for Badge
            doc.roundedRect(badgeX + 2, 152, positionWidth, 32, 8)
               .fillOpacity(0.1)
               .fill('#000000');

            // Badge Body
            doc.roundedRect(badgeX, 150, positionWidth, 32, 8)
               .fillOpacity(1)
               .fill('#FFFFFF')
               .strokeColor(COLORS.primary)
               .lineWidth(1)
               .stroke();
            
            doc.fillColor(COLORS.primary)
               .text(positionText, badgeX, 158, { width: positionWidth, align: 'center' });
            
            // Reset position
            let yPos = 200;
            
            // ====================================================
            // HELPER FUNCTIONS (DESIGN ONLY)
            // ====================================================
            
            function addModernSectionHeader(doc, title, y) {
                // Left accent bar
                doc.roundedRect(60, y, 4, 22, 2)
                   .fill(COLORS.primary);
                
                // Title
                doc.fontSize(16)
                   .fillColor(COLORS.text)
                   .font('SarabunBold')
                   .text(title, 75, y);
                
                // Bottom line (Faded)
                doc.moveTo(75, y + 26)
                   .lineTo(doc.page.width - 60, y + 26)
                   .lineWidth(0.5)
                   .strokeOpacity(0.2)
                   .strokeColor(COLORS.primary)
                   .stroke();
                
                doc.strokeOpacity(1);
            }
            
            function addSubHeader(doc, title, x, y) {
                doc.fontSize(11)
                   .fillColor(COLORS.secondary)
                   .font('SarabunBold')
                   .text(title, x, y);
            }
            
            function addCleanField(doc, label, value, x, y) {
                if (!value) return; // Skip if empty

                // Label
                doc.fontSize(10)
                   .fillColor(COLORS.label)
                   .font('Sarabun')
                   .text(label, x, y);
                
                // Value
                const labelWidth = doc.widthOfString(label);
                doc.fontSize(10)
                   .fillColor(COLORS.text)
                   .font('Sarabun')
                   .text(`: ${value}`, x + labelWidth + 5, y);
            }

            // ====================================================
            // SECTION: PERSONAL INFORMATION
            // ====================================================
            
            addModernSectionHeader(doc, '📋 ข้อมูลส่วนตัว', yPos);
            yPos += 40;
            
            // Two-column layout for personal info
            const leftCol = 60;
            const rightCol = 320;
            
            // Column 1
            addCleanField(doc, 'ชื่อ-นามสกุล (ไทย)', data.personal_info.fullname_th, leftCol, yPos);
            yPos += 22;
            
            if (data.personal_info.fullname_en) {
                addCleanField(doc, 'Full Name (EN)', data.personal_info.fullname_en, leftCol, yPos);
                yPos += 22;
            }
            
            addCleanField(doc, 'เพศ', data.personal_info.gender, leftCol, yPos);
            addCleanField(doc, 'อายุ', `${data.personal_info.age} ปี`, rightCol, yPos);
            yPos += 22;
            
            addCleanField(doc, 'วันเกิด', data.personal_info.birthdate, leftCol, yPos);
            addCleanField(doc, 'สัญชาติ', data.personal_info.nationality, rightCol, yPos);
            yPos += 22;
            
            addCleanField(doc, 'เชื้อชาติ', data.personal_info.ethnicity, leftCol, yPos);
            addCleanField(doc, 'ศาสนา', data.personal_info.religion, rightCol, yPos);
            yPos += 22;
            
            addCleanField(doc, 'เลขบัตรประชาชน', data.personal_info.id_card, leftCol, yPos);
            yPos += 35;
            
            // Contact Info Box (Rounded Background)
            doc.roundedRect(55, yPos - 5, doc.page.width - 110, 90, 8)
               .fillOpacity(0.4)
               .fill(COLORS.lightBg);
            
            doc.fillOpacity(1);
            addSubHeader(doc, 'ข้อมูลการติดต่อ', leftCol + 10, yPos + 5);
            yPos += 28;
            
            addCleanField(doc, '📱 เบอร์โทร', data.personal_info.phone, leftCol + 10, yPos);
            addCleanField(doc, '💬 LINE ID', data.personal_info.line_id, rightCol, yPos);
            yPos += 22;
            
            addCleanField(doc, '📧 อีเมล', data.personal_info.email, leftCol + 10, yPos);
            yPos += 30;
            
            // Address
            addSubHeader(doc, 'ที่อยู่ปัจจุบัน', leftCol, yPos);
            yPos += 25;
            
            doc.fontSize(10)
               .fillColor(COLORS.text)
               .font('Sarabun')
               .text(data.personal_info.address.full, leftCol, yPos, { width: 475, lineGap: 3 });
            yPos += 20;
            
            doc.fontSize(10)
               .fillColor(COLORS.label)
               .text(`${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}, ${data.personal_info.address.province} ${data.personal_info.address.zipcode}`, 
                   leftCol, yPos, { width: 475 });
            yPos += 40;
            
            // Check page break
            if (yPos > 680) {
                doc.addPage();
                yPos = 60;
            }
            
            // ====================================================
            // SECTION: EDUCATION
            // ====================================================
            
            addModernSectionHeader(doc, '🎓 ประวัติการศึกษา', yPos);
            yPos += 40;
            
            function addEducationEntry(doc, level, school, major, year, y) {
                // Card Background for Edu
                doc.roundedRect(60, y - 5, doc.page.width - 120, 40, 5)
                   .fillOpacity(0.3)
                   .fill(COLORS.lightBg);
                doc.fillOpacity(1);

                // Timeline dot style
                doc.circle(70, y + 8, 3).fill(COLORS.primary);
                
                // Level badge
                doc.fontSize(10)
                   .fillColor(COLORS.primary)
                   .font('SarabunBold')
                   .text(level, 85, y);
                
                // School name
                doc.fontSize(10)
                   .fillColor(COLORS.text)
                   .font('Sarabun')
                   .text(school, 85, y + 15);
                
                // Major and year (Right Aligned roughly)
                if (major || year) {
                    doc.fontSize(9)
                       .fillColor(COLORS.label)
                       .text(`${major || '-'}  |  ปีที่จบ: ${year || '-'}`, 300, y + 15, { width: 200, align: 'right' });
                }
            }

            // Education entries
            if (data.education.high_school.school) {
                addEducationEntry(doc, 'มัธยมศึกษา / เทียบเท่า',
                    data.education.high_school.school,
                    data.education.high_school.major,
                    data.education.high_school.year,
                    yPos);
                yPos += 50;
            }
            
            if (data.education.vocational.school) {
                addEducationEntry(doc, 'ปวช. / ปวส.',
                    data.education.vocational.school,
                    data.education.vocational.major,
                    data.education.vocational.year,
                    yPos);
                yPos += 50;
            }
            
            if (data.education.bachelor.school) {
                addEducationEntry(doc, 'ปริญญาตรี',
                    data.education.bachelor.school,
                    data.education.bachelor.major,
                    data.education.bachelor.year,
                    yPos);
                yPos += 50;
            }
            
            if (data.education.other.school) {
                addEducationEntry(doc, 'อื่นๆ',
                    data.education.other.school,
                    data.education.other.major,
                    data.education.other.year,
                    yPos);
                yPos += 50;
            }

            // Education used for application (Modern Highlight Box)
            if (data.education.education_used) {
                yPos += 5;
                doc.roundedRect(60, yPos - 5, doc.page.width - 120, 30, 6)
                   .fillOpacity(0.1)
                   .fill(COLORS.secondary);
                
                doc.fillOpacity(1)
                   .fontSize(10)
                   .fillColor(COLORS.secondary)
                   .font('SarabunBold')
                   .text('วุฒิการศึกษาที่ใช้สมัคร:', 75, yPos + 5);
                
                doc.fillColor(COLORS.text)
                   .font('Sarabun')
                   .text(data.education.education_used, 230, yPos + 5);
                
                yPos += 40;
            }
            
            // Check page break
            if (yPos > 680) {
                doc.addPage();
                yPos = 60;
            }
            
            // ====================================================
            // SECTION: WORK EXPERIENCE
            // ====================================================
            
            addModernSectionHeader(doc, '💼 ประสบการณ์การทำงาน', yPos);
            yPos += 40;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    // Card Container
                    doc.roundedRect(60, yPos, doc.page.width - 120, 75, 8)
                       .lineWidth(0.5)
                       .strokeColor(COLORS.border)
                       .stroke();

                    // Position
                    doc.fontSize(12)
                       .fillColor(COLORS.text)
                       .font('SarabunBold')
                       .text(`${work.position || 'ตำแหน่ง'}`, 75, yPos + 10);
                    
                    // Company
                    doc.fontSize(10)
                       .fillColor(COLORS.secondary)
                       .font('Sarabun')
                       .text(work.company, 75, yPos + 28);
                    
                    // Date
                    doc.fontSize(9)
                       .fillColor(COLORS.label)
                       .text(`⏱ ${work.start || '-'} ถึง ${work.end || '-'}`, doc.page.width - 250, yPos + 10, { align: 'right' });
                    
                    if (work.reason) {
                        doc.fontSize(9)
                           .fillColor(COLORS.label)
                           .text(`สาเหตุที่ออก: ${work.reason}`, 75, yPos + 48, { width: 450 });
                    }
                    
                    yPos += 90;
                    
                    // Check page break
                    if (yPos > 680) {
                        doc.addPage();
                        yPos = 60;
                    }
                });
            } else {
                doc.fontSize(10)
                   .fillColor(COLORS.label)
                   .font('Sarabun')
                   .text('• ไม่มีประสบการณ์ทำงาน', 75, yPos);
                yPos += 35;
            }
            
            // Check page break
            if (yPos > 650) {
                doc.addPage();
                yPos = 60;
            }
            
            // ====================================================
            // SECTION: ADDITIONAL INFORMATION
            // ====================================================
            
            addModernSectionHeader(doc, '✨ ข้อมูลเพิ่มเติม', yPos);
            yPos += 40;

            // Health Information
            if (data.additional_info.has_disease) {
                addCleanField(doc, 'โรคประจำตัว', data.additional_info.has_disease, leftCol, yPos);
                yPos += 22;
                
                if (data.additional_info.disease_detail) {
                    doc.fontSize(9)
                       .fillColor('#e74c3c') // Red for alerts
                       .font('Sarabun')
                       .text(`รายละเอียด: ${data.additional_info.disease_detail}`, leftCol + 20, yPos, { width: 460 });
                    yPos += 22;
                }
            }

            // Criminal Record
            if (data.additional_info.has_criminal_record) {
                addCleanField(doc, 'ประวัติอาชญากรรม', data.additional_info.has_criminal_record, leftCol, yPos);
                yPos += 22;
                
                if (data.additional_info.criminal_detail) {
                    doc.fontSize(9)
                       .fillColor('#e74c3c')
                       .font('Sarabun')
                       .text(`รายละเอียด: ${data.additional_info.criminal_detail}`, leftCol + 20, yPos, { width: 460 });
                    yPos += 22;
                }
            }
            
            if (data.additional_info.special_skills) {
                addCleanField(doc, '🌟 ทักษะพิเศษ', data.additional_info.special_skills, leftCol, yPos);
                yPos += 25;
            }
            
            // Salary & Start Date Highlight
            if (data.additional_info.expected_salary || data.additional_info.start_date) {
                doc.roundedRect(60, yPos - 5, doc.page.width - 120, 35, 5)
                   .fillOpacity(0.05)
                   .fill(COLORS.primary);
                doc.fillOpacity(1);

                if (data.additional_info.expected_salary) {
                    addCleanField(doc, '💰 เงินเดือนที่คาดหวัง', `${data.additional_info.expected_salary} บาท`, leftCol + 10, yPos + 5);
                }
                if (data.additional_info.start_date) {
                    addCleanField(doc, '📅 สามารถเริ่มงานได้', data.additional_info.start_date, rightCol, yPos + 5);
                }
                yPos += 45;
            }
            
            // Motivation (special card)
            if (data.additional_info.motivation) {
                yPos += 10;
                
                // Modern Box for Motivation
                doc.roundedRect(60, yPos - 5, doc.page.width - 120, 80, 8)
                   .lineWidth(0.5)
                   .strokeColor(COLORS.border)
                   .stroke();
                
                doc.fillColor(COLORS.secondary)
                   .fontSize(10)
                   .font('SarabunBold')
                   .text('💭 เหตุผลที่ต้องการร่วมงาน', 75, yPos + 10);
                
                yPos += 25;
                
                doc.fontSize(9)
                   .fillColor(COLORS.text)
                   .font('Sarabun')
                   .text(data.additional_info.motivation, 75, yPos, { 
                       width: doc.page.width - 150,
                       align: 'left',
                       lineGap: 4
                   });
            }
            
            // ====================================================
            // MODERN FOOTER
            // ====================================================
            
            const footerY = doc.page.height - 50;
            
            // Top border line (Faded)
            doc.moveTo(60, footerY - 15)
               .lineTo(doc.page.width - 60, footerY - 15)
               .lineWidth(0.5)
               .strokeOpacity(0.3)
               .strokeColor(COLORS.primary)
               .stroke();
            
            doc.strokeOpacity(1)
               .fontSize(8)
               .fillColor(COLORS.label)
               .font('Sarabun')
               .text('สร้างโดยระบบรับสมัครงานอัตโนมัติ | Generated by Job Application System', 
                   60, footerY, { 
                       align: 'center',
                       width: doc.page.width - 120
                   });
            
            doc.fontSize(7)
               .fillColor('#bdc3c7')
               .text('© 2024 Made with 💚 in Thailand', 
                   60, footerY + 15, {
                       align: 'center',
                       width: doc.page.width - 120
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
// JOB APPLICATION ENDPOINT WITH PDF
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
        
        // Generate PDF with improved design
        console.log('Generating PDF with improved design...');
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
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px; }
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
        
        await sendEmail(email, 'ยืนยันการรับใบสมัครงาน (Application Received)', applicantEmailHTML);

        // Send notification to HR
        const hrEmailHTML = `
            <h2>📄 มีใบสมัครงานใหม่</h2>
            <p><strong>ตำแหน่ง:</strong> ${position}</p>
            <p><strong>ผู้สมัคร:</strong> ${fullname_th}</p>
            <p>กรุณาตรวจสอบไฟล์แนบ</p>
        `;
        
        await sendEmail(process.env.HR_EMAIL || process.env.EMAIL_USER, `New Job Application: ${position} - ${fullname_th}`, hrEmailHTML, attachments);
        
        res.json({
            success: true,
            message: 'บันทึกใบสมัครและส่งอีเมลเรียบร้อยแล้ว',
            applicationId: application.id
        });

    } catch (error) {
        console.error('Error processing application:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
            error: error.message
        });
    }
});

// Export the app
module.exports = app;
