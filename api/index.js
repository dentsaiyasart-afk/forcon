// api/index.js - MODERN CLEAN PDF DESIGN (FIXED)
// ====================================================

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const axios = require('axios');

// ใช้ memoryStorage เพื่อให้ได้ buffer ของรูปภาพทันที
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
    if (thaiFont && thaiFontBold) return { regular: thaiFont, bold: thaiFontBold };
    
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
        
        return { regular: thaiFont, bold: thaiFontBold };
    } catch (error) {
        console.error('Error downloading fonts:', error);
        // Fallback logic if needed, but essential for PDF
        throw new Error('Cannot download Thai font');
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
// BEAUTIFUL PDF GENERATION - CLEAN & MODERN (REVISED)
// ====================================================

async function generateJobApplicationPDF(data, photoBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const fonts = await downloadThaiFont();
            
            // Create PDF - Set margins to maximize space
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 40, right: 40 },
                bufferPages: true
            });
            
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Register Fonts
            doc.registerFont('Sarabun', fonts.regular);
            doc.registerFont('SarabunBold', fonts.bold);

            // Design Constants
            const PRIMARY_COLOR = '#1a365d'; // Navy Blue (Professional)
            const ACCENT_COLOR = '#3182ce';  // Bright Blue
            const TEXT_COLOR = '#2d3748';    // Dark Gray
            const LABEL_COLOR = '#718096';   // Light Gray
            const BORDER_COLOR = '#e2e8f0';  // Very Light Gray
            
            // ====================================================
            // HEADER SECTION (Top Left: Info, Top Right: Photo)
            // ====================================================
            
            let cursorY = 30;
            
            // 1. Render Photo (Top Right)
            if (photoBuffer) {
                try {
                    const photoWidth = 80;
                    const photoHeight = 95; // Approx 4:5 ratio
                    const photoX = doc.page.width - 40 - photoWidth;
                    const photoY = cursorY;

                    doc.save();
                    // Clip rounded rectangle
                    doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 4).clip();
                    doc.image(photoBuffer, photoX, photoY, {
                        fit: [photoWidth, photoHeight],
                        align: 'center',
                        valign: 'center'
                    });
                    doc.restore();
                    
                    // Draw border around photo
                    doc.lineWidth(1)
                       .strokeColor(BORDER_COLOR)
                       .roundedRect(photoX, photoY, photoWidth, photoHeight, 4)
                       .stroke();
                } catch (err) {
                    console.error("Error rendering photo:", err);
                }
            }

            // 2. Render Header Info (Top Left)
            doc.fillColor(ACCENT_COLOR)
               .fontSize(10)
               .font('SarabunBold')
               .text('ใบสมัครงาน / APPLICATION FORM', 40, cursorY);
            
            cursorY += 15;
            
            doc.fillColor(PRIMARY_COLOR)
               .fontSize(24)
               .font('SarabunBold')
               .text(data.personal_info.fullname_th, 40, cursorY);
               
            cursorY += 30;
            
            if (data.personal_info.fullname_en) {
                doc.fillColor(LABEL_COLOR)
                   .fontSize(14)
                   .font('Sarabun')
                   .text(data.personal_info.fullname_en.toUpperCase(), 40, cursorY);
                cursorY += 20;
            }

            // Badge for Position
            doc.rect(40, cursorY, 350, 25).fill(PRIMARY_COLOR);
            doc.fillColor('#FFFFFF')
               .fontSize(14)
               .font('SarabunBold')
               .text(`ตำแหน่ง: ${data.position}`, 50, cursorY + 5);
            
            // Application ID (Small next to position)
            doc.fillColor(LABEL_COLOR)
               .fontSize(9)
               .font('Sarabun')
               .text(`Ref: ${data.id}`, 40, cursorY + 30);

            // Divider Line
            cursorY = 140; // Force set Y to ensure clearance from photo
            doc.moveTo(40, cursorY)
               .lineTo(doc.page.width - 40, cursorY)
               .lineWidth(0.5)
               .strokeColor(BORDER_COLOR)
               .stroke();
            
            cursorY += 15;

            // ====================================================
            // TWO COLUMN LAYOUT
            // ====================================================
            
            const leftColX = 40;
            const leftColWidth = 180; // 35% width
            const rightColX = 240;
            const rightColWidth = 315; // 65% width
            
            let leftCursor = cursorY;
            let rightCursor = cursorY;

            // Helper to draw Section Header
            function drawSectionHeader(doc, text, x, y) {
                doc.fillColor(PRIMARY_COLOR)
                   .fontSize(12)
                   .font('SarabunBold')
                   .text(text.toUpperCase(), x, y);
                
                doc.rect(x, y + 16, 30, 2).fill(ACCENT_COLOR);
                return y + 25;
            }

            // Helper to draw Label-Value pair
            function drawField(doc, label, value, x, y, width) {
                doc.fillColor(LABEL_COLOR)
                   .fontSize(9)
                   .font('Sarabun')
                   .text(label, x, y, { width: width, continued: true });
                
                doc.fillColor(TEXT_COLOR)
                   .font('Sarabun')
                   .text(`  ${value}`, { width: width });
                
                return y + 14; // Compact line height
            }

            // --- LEFT COLUMN CONTENT ---

            // 1. Personal Info
            leftCursor = drawSectionHeader(doc, 'ข้อมูลส่วนตัว', leftColX, leftCursor);
            leftCursor = drawField(doc, 'อายุ:', `${data.personal_info.age} ปี`, leftColX, leftCursor, leftColWidth);
            leftCursor = drawField(doc, 'วันเกิด:', data.personal_info.birthdate, leftColX, leftCursor, leftColWidth);
            leftCursor = drawField(doc, 'เพศ:', data.personal_info.gender, leftColX, leftCursor, leftColWidth);
            leftCursor = drawField(doc, 'สัญชาติ:', data.personal_info.nationality, leftColX, leftCursor, leftColWidth);
            leftCursor = drawField(doc, 'ศาสนา:', data.personal_info.religion, leftColX, leftCursor, leftColWidth);
            leftCursor = drawField(doc, 'เลขบัตร:', data.personal_info.id_card, leftColX, leftCursor, leftColWidth);
            leftCursor += 10;

            // 2. Contact Info
            leftCursor = drawSectionHeader(doc, 'ข้อมูลติดต่อ', leftColX, leftCursor);
            
            // Phone
            doc.font('SarabunBold').fillColor(TEXT_COLOR).fontSize(9).text(data.personal_info.phone, leftColX, leftCursor);
            leftCursor += 12;
            // Email
            doc.font('Sarabun').fillColor(TEXT_COLOR).fontSize(9).text(data.personal_info.email, leftColX, leftCursor, { width: leftColWidth });
            leftCursor += 12;
            // Line
            if(data.personal_info.line_id) {
                 doc.text(`Line: ${data.personal_info.line_id}`, leftColX, leftCursor);
                 leftCursor += 12;
            }
            // Address
            leftCursor += 5;
            doc.fillColor(LABEL_COLOR).fontSize(8).text('ที่อยู่ปัจจุบัน:', leftColX, leftCursor);
            leftCursor += 10;
            doc.fillColor(TEXT_COLOR).fontSize(9)
               .text(`${data.personal_info.address.full} ${data.personal_info.address.subdistrict} ${data.personal_info.address.district} ${data.personal_info.address.province} ${data.personal_info.address.zipcode}`, 
               leftColX, leftCursor, { width: leftColWidth });
            
            leftCursor += doc.heightOfString('test', { width: leftColWidth }) * 2.5; 

            // 3. Education (Sidebar style)
            leftCursor += 10;
            leftCursor = drawSectionHeader(doc, 'ประวัติการศึกษา', leftColX, leftCursor);
            
            const eduLevels = [
                { k: 'bachelor', l: 'ปริญญาตรี' },
                { k: 'vocational', l: 'ปวช./ปวส.' },
                { k: 'high_school', l: 'มัธยมศึกษา' },
                { k: 'other', l: 'อื่นๆ' }
            ];

            eduLevels.forEach(edu => {
                const info = data.education[edu.k];
                if (info && info.school) {
                    doc.fillColor(ACCENT_COLOR).fontSize(8).font('SarabunBold').text(edu.l, leftColX, leftCursor);
                    leftCursor += 10;
                    doc.fillColor(TEXT_COLOR).fontSize(9).font('SarabunBold').text(info.school, leftColX, leftCursor, { width: leftColWidth });
                    leftCursor += 12;
                    if (info.major || info.year) {
                        doc.font('Sarabun').fillColor(LABEL_COLOR).text(`${info.major || '-'} | ${info.year || '-'}`, leftColX, leftCursor, { width: leftColWidth });
                        leftCursor += 14;
                    }
                    leftCursor += 4;
                }
            });
            
            doc.fontSize(8).fillColor(LABEL_COLOR).text(`วุฒิสูงสุดที่ใช้สมัคร: ${data.education.education_used}`, leftColX, leftCursor + 5, { width: leftColWidth });

            // --- RIGHT COLUMN CONTENT ---

            // 1. Work Experience (The core content)
            rightCursor = drawSectionHeader(doc, 'ประสบการณ์ทำงาน', rightColX, rightCursor);

            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    // Bullet point line
                    doc.circle(rightColX + 4, rightCursor + 6, 3).fill(ACCENT_COLOR);
                    
                    // Position
                    doc.fillColor(TEXT_COLOR)
                       .fontSize(11)
                       .font('SarabunBold')
                       .text(work.position || 'ตำแหน่งงาน', rightColX + 15, rightCursor);
                    
                    // Company & Date (Same line if fits, or next line)
                    doc.fontSize(10)
                       .font('Sarabun')
                       .text(`${work.company}  |  ${work.start || '-'} ถึง ${work.end || '-'}`, rightColX + 15, rightCursor + 14);
                    
                    // Reason
                    if (work.reason) {
                        doc.fontSize(9)
                           .fillColor(LABEL_COLOR)
                           .text(`เหตุผลที่ออก: ${work.reason}`, rightColX + 15, rightCursor + 28, { width: rightColWidth - 15 });
                        rightCursor += 42;
                    } else {
                        rightCursor += 32;
                    }
                    
                    rightCursor += 8; // Spacing between jobs
                });
            } else {
                doc.fillColor(LABEL_COLOR).fontSize(10).font('Sarabun').text('ไม่มีประสบการณ์ทำงาน (นักศึกษาจบใหม่/ว่างงาน)', rightColX, rightCursor);
                rightCursor += 20;
            }

            // 2. Skills & Details
            rightCursor += 15;
            rightCursor = drawSectionHeader(doc, 'ความสามารถ & ข้อมูลเพิ่มเติม', rightColX, rightCursor);
            
            // Grid for details (2 sub-columns in right column)
            const subCol1 = rightColX;
            const subCol2 = rightColX + 160;
            
            let detailY = rightCursor;
            
            // Left Sub-col
            doc.fillColor(TEXT_COLOR).fontSize(9).font('SarabunBold').text('ทักษะพิเศษ:', subCol1, detailY);
            doc.font('Sarabun').text(data.additional_info.special_skills || '-', subCol1, detailY + 12, { width: 150 });
            
            // Right Sub-col
            doc.font('SarabunBold').text('เงินเดือนที่คาดหวัง:', subCol2, detailY);
            doc.font('Sarabun').text(`${data.additional_info.expected_salary || '-'} บาท`, subCol2, detailY + 12);

            // Advance Y based on text height
            detailY += 40;
            
            doc.font('SarabunBold').text('วันที่เริ่มงานได้:', subCol1, detailY);
            doc.font('Sarabun').text(data.additional_info.start_date || '-', subCol1, detailY + 12);
            
            detailY += 30;
            
            // 3. Motivation
            if (data.additional_info.motivation) {
                rightCursor = Math.max(rightCursor + 80, detailY + 10);
                rightCursor = drawSectionHeader(doc, 'เหตุผลที่ต้องการร่วมงาน', rightColX, rightCursor);
                
                doc.fillColor(TEXT_COLOR)
                   .fontSize(9)
                   .font('Sarabun')
                   .text(data.additional_info.motivation, rightColX, rightCursor, { 
                       width: rightColWidth, 
                       align: 'justify' 
                   });
                
                rightCursor += doc.heightOfString(data.additional_info.motivation, { width: rightColWidth }) + 15;
            } else {
                rightCursor = detailY + 10;
            }

            // 4. Health & Legal (Small print at bottom right or flow naturally)
            rightCursor += 10;
            doc.fillColor(LABEL_COLOR).fontSize(8).font('Sarabun');
            
            const healthText = data.additional_info.has_disease && data.additional_info.has_disease !== 'ไม่มี' 
                ? `โรคประจำตัว: ${data.additional_info.disease_detail}` 
                : 'สุขภาพแข็งแรงสมบูรณ์ ไม่มีโรคประจำตัวร้ายแรง';
                
            const criminalText = data.additional_info.has_criminal_record && data.additional_info.has_criminal_record !== 'ไม่มี'
                ? `ประวัติอาชญากรรม: ${data.additional_info.criminal_detail}`
                : 'ไม่เคยมีประวัติอาชญากรรม';
            
            doc.text(`• ${healthText}`, rightColX, rightCursor);
            doc.text(`• ${criminalText}`, rightColX, rightCursor + 12);

            // ====================================================
            // FOOTER
            // ====================================================
            const footerY = doc.page.height - 40;
            doc.fontSize(8)
               .fillColor(BORDER_COLOR)
               .text('____________________________________________________________________________________________________', 40, footerY - 10);
            
            doc.fillColor(LABEL_COLOR)
               .text(`สร้างโดยระบบรับสมัครงานอัตโนมัติ • วันที่: ${new Date().toLocaleDateString('th-TH')}`, 40, footerY);
            
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
            edu_other, edu_other_major, edu_other_year,
            education_used,
            work1_company, work1_position, work1_start, work1_end, work1_reason,
            work2_company, work2_position, work2_start, work2_end, work2_reason,
            work3_company, work3_position, work3_start, work3_end, work3_reason,
            has_disease, disease_detail,
            has_criminal_record, criminal_detail,
            special_skills, expected_salary, start_date, motivation
        } = req.body;
        
        // Validation
        if (!position || !fullname_th || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
            });
        }

        // Photo is required
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
                nationality, ethnicity, religion, id_card, phone, line_id, email,
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
            submitted_at: new Date().toISOString()
        };
        
        // Get Photo Buffer for PDF
        const photoBuffer = req.files.photo[0].buffer;

        // Generate beautiful PDF
        console.log('Generating beautiful PDF...');
        const pdfBuffer = await generateJobApplicationPDF(application, photoBuffer);
        console.log('PDF generated successfully');
        
        // Prepare attachments
        const attachments = [
            {
                filename: `Job_Application_${fullname_th}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            },
            {
                filename: `Photo_${req.files.photo[0].originalname}`,
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
        
        // Send confirmation email
        const applicantEmailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">ได้รับใบสมัครงานเรียบร้อยแล้ว</h2>
                <p>สวัสดีคุณ <strong>${fullname_th}</strong>,</p>
                <p>ขอบคุณที่สนใจร่วมงานกับเรา เราได้รับข้อมูลการสมัครงานตำแหน่ง <strong>${position}</strong> เรียบร้อยแล้ว</p>
                <p>ทางฝ่ายบุคคลจะพิจารณาข้อมูลและติดต่อกลับภายใน 7 วันทำการ</p>
                <hr style="border: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">รหัสใบสมัคร: ${application.id}</p>
            </div>
        `;
        
        await sendEmail(email, 'ยืนยันการรับใบสมัครงาน', applicantEmailHTML);
        
        // Send to Admin
        const adminEmailHTML = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #1a365d;">📝 New Job Application</h2>
                <p><strong>ผู้สมัคร:</strong> ${fullname_th}</p>
                <p><strong>ตำแหน่ง:</strong> ${position}</p>
                <p><strong>โทร:</strong> ${phone}</p>
                <p><strong>อีเมล:</strong> ${email}</p>
                <br>
                <p>กรุณาตรวจสอบไฟล์ PDF ที่แนบมาเพื่อดูรายละเอียดทั้งหมด</p>
            </div>
        `;
        
        await sendEmail(
            process.env.ADMIN_EMAIL || 'forcon674@outlook.com',
            `ใบสมัครงานใหม่: ${position} - ${fullname_th}`,
            adminEmailHTML,
            attachments
        );
        
        res.json({
            success: true,
            message: 'ส่งใบสมัครงานสำเร็จ! เราจะติดต่อกลับ ภายใน 7 วันทำการ',
            application_id: application.id
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
        });
    }
});

module.exports = app;
