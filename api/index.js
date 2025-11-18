// api/index.js - FIXED VERSION with Thai Language Support
// ====================================================

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
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
// HTML TEMPLATE FOR PDF (รองรับภาษาไทย 100%)
// ====================================================

function generateJobApplicationHTML(data) {
    return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ใบสมัครงาน - ${data.personal_info.fullname_th}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Sarabun', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.95;
        }
        
        .app-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
        }
        
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 20px;
            color: #667eea;
            font-weight: 700;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        
        .field-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 10px;
        }
        
        .field {
            margin-bottom: 10px;
        }
        
        .field-label {
            font-weight: 600;
            color: #000;
            display: inline-block;
            min-width: 150px;
        }
        
        .field-value {
            color: #555;
            display: inline;
        }
        
        .work-item {
            background: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #667eea;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        
        .work-item h4 {
            color: #667eea;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            color: #999;
            font-size: 12px;
        }
        
        @media print {
            body {
                padding: 0;
            }
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ระบบรับสมัครงาน</h1>
        <p>Job Application Form - ใบสมัครงาน</p>
    </div>
    
    <div class="app-info">
        <div><strong>รหัสใบสมัคร:</strong> ${data.id}</div>
        <div><strong>วันที่สมัคร:</strong> ${new Date().toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}</div>
    </div>
    
    <!-- Personal Information -->
    <div class="section">
        <h2 class="section-title">📋 ข้อมูลส่วนตัว</h2>
        
        <div class="field">
            <span class="field-label">ตำแหน่งที่สมัคร:</span>
            <span class="field-value"><strong>${data.position}</strong></span>
        </div>
        
        <div class="field-group">
            <div class="field">
                <span class="field-label">ชื่อ-นามสกุล (ไทย):</span>
                <span class="field-value">${data.personal_info.fullname_th}</span>
            </div>
            ${data.personal_info.fullname_en ? `
            <div class="field">
                <span class="field-label">Full Name (English):</span>
                <span class="field-value">${data.personal_info.fullname_en}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="field-group">
            <div class="field">
                <span class="field-label">เพศ:</span>
                <span class="field-value">${data.personal_info.gender}</span>
            </div>
            <div class="field">
                <span class="field-label">วันเกิด:</span>
                <span class="field-value">${data.personal_info.birthdate} (อายุ ${data.personal_info.age} ปี)</span>
            </div>
        </div>
        
        <div class="field-group">
            <div class="field">
                <span class="field-label">สัญชาติ:</span>
                <span class="field-value">${data.personal_info.nationality}</span>
            </div>
            <div class="field">
                <span class="field-label">เชื้อชาติ:</span>
                <span class="field-value">${data.personal_info.ethnicity}</span>
            </div>
        </div>
        
        <div class="field-group">
            <div class="field">
                <span class="field-label">ศาสนา:</span>
                <span class="field-value">${data.personal_info.religion}</span>
            </div>
            <div class="field">
                <span class="field-label">เลขบัตรประชาชน:</span>
                <span class="field-value">${data.personal_info.id_card}</span>
            </div>
        </div>
        
        <div class="field-group">
            <div class="field">
                <span class="field-label">เบอร์โทร:</span>
                <span class="field-value">${data.personal_info.phone}</span>
            </div>
            <div class="field">
                <span class="field-label">LINE ID:</span>
                <span class="field-value">${data.personal_info.line_id}</span>
            </div>
        </div>
        
        <div class="field">
            <span class="field-label">อีเมล:</span>
            <span class="field-value">${data.personal_info.email}</span>
        </div>
        
        <div class="field">
            <span class="field-label">ที่อยู่:</span>
            <span class="field-value">${data.personal_info.address.full}</span>
        </div>
        
        <div class="field">
            <span class="field-label">ตำบล/เขต:</span>
            <span class="field-value">${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}, ${data.personal_info.address.province} ${data.personal_info.address.zipcode}</span>
        </div>
    </div>
    
    <!-- Education -->
    <div class="section">
        <h2 class="section-title">🎓 ประวัติการศึกษา</h2>
        
        ${data.education.high_school.school ? `
        <div class="field">
            <span class="field-label">มัธยมศึกษา/เทียบเท่า:</span>
            <span class="field-value">${data.education.high_school.school} (${data.education.high_school.major || '-'}) - ${data.education.high_school.year || '-'}</span>
        </div>
        ` : ''}
        
        ${data.education.vocational.school ? `
        <div class="field">
            <span class="field-label">ปวช./ปวส.:</span>
            <span class="field-value">${data.education.vocational.school} (${data.education.vocational.major || '-'}) - ${data.education.vocational.year || '-'}</span>
        </div>
        ` : ''}
        
        ${data.education.bachelor.school ? `
        <div class="field">
            <span class="field-label">ปริญญาตรี:</span>
            <span class="field-value">${data.education.bachelor.school} (${data.education.bachelor.major || '-'}) - ${data.education.bachelor.year || '-'}</span>
        </div>
        ` : ''}
        
        ${data.education.other.school ? `
        <div class="field">
            <span class="field-label">อื่นๆ:</span>
            <span class="field-value">${data.education.other.school} (${data.education.other.major || '-'}) - ${data.education.other.year || '-'}</span>
        </div>
        ` : ''}
        
        <div class="field" style="margin-top: 15px;">
            <span class="field-label">วุฒิการศึกษาที่ใช้สมัคร:</span>
            <span class="field-value"><strong>${data.education.education_used}</strong></span>
        </div>
    </div>
    
    <!-- Work Experience -->
    <div class="section">
        <h2 class="section-title">💼 ประสบการณ์การทำงาน</h2>
        
        ${data.work_experience.length > 0 ? 
            data.work_experience.map((work, index) => `
                <div class="work-item">
                    <h4>ประสบการณ์งานที่ ${index + 1}</h4>
                    <div class="field">
                        <span class="field-label">บริษัท/สถานประกอบการ:</span>
                        <span class="field-value">${work.company}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">ตำแหน่ง:</span>
                        <span class="field-value">${work.position || '-'}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">ระยะเวลา:</span>
                        <span class="field-value">${work.start || '-'} ถึง ${work.end || '-'}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">เหตุผลที่ลาออก:</span>
                        <span class="field-value">${work.reason || '-'}</span>
                    </div>
                </div>
            `).join('') 
        : '<p style="color: #999;">ไม่มีประสบการณ์ทำงาน</p>'}
    </div>
    
    <!-- Additional Information -->
    <div class="section">
        <h2 class="section-title">✨ ข้อมูลเพิ่มเติม</h2>
        
        <div class="field">
            <span class="field-label">มีโรคประจำตัวหรือไม่:</span>
            <span class="field-value">${data.additional_info.has_disease}${data.additional_info.disease_detail ? ' - ' + data.additional_info.disease_detail : ''}</span>
        </div>
        
        <div class="field">
            <span class="field-label">เคยต้องโทษหรือไม่:</span>
            <span class="field-value">${data.additional_info.has_criminal_record}${data.additional_info.criminal_detail ? ' - ' + data.additional_info.criminal_detail : ''}</span>
        </div>
        
        ${data.additional_info.special_skills ? `
        <div class="field">
            <span class="field-label">ทักษะพิเศษ:</span>
            <span class="field-value">${data.additional_info.special_skills}</span>
        </div>
        ` : ''}
        
        ${data.additional_info.expected_salary ? `
        <div class="field">
            <span class="field-label">เงินเดือนที่คาดหวัง:</span>
            <span class="field-value">${data.additional_info.expected_salary} บาท</span>
        </div>
        ` : ''}
        
        ${data.additional_info.start_date ? `
        <div class="field">
            <span class="field-label">สามารถเริ่มงานได้:</span>
            <span class="field-value">${data.additional_info.start_date}</span>
        </div>
        ` : ''}
        
        ${data.additional_info.motivation ? `
        <div class="field" style="margin-top: 15px;">
            <span class="field-label" style="display: block; margin-bottom: 5px;">เหตุผลที่ต้องการร่วมงาน:</span>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
                ${data.additional_info.motivation}
            </div>
        </div>
        ` : ''}
    </div>
    
    <div class="footer">
        <p>สร้างโดย ระบบรับสมัครงานอัตโนมัติ | Generated by Job Application System</p>
        <p style="margin-top: 5px;">© 2024 Made with 💚 in Thailand</p>
    </div>
</body>
</html>
    `;
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
// JOB APPLICATION ENDPOINT WITH HTML ATTACHMENT
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
        
        // Generate HTML (แทน PDF)
        console.log('Generating HTML document...');
        const htmlContent = generateJobApplicationHTML(application);
        console.log('HTML generated successfully');
        
        // Prepare attachments
        const attachments = [
            {
                filename: `Job_Application_${fullname_th}_${application.id}.html`,
                content: Buffer.from(htmlContent, 'utf-8'),
                contentType: 'text/html'
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
        
        await sendEmail(
            email, 
            '🎉 ยืนยันการรับใบสมัครงาน', 
            applicantEmailHTML
        );
        
        // Send notification email to admin with HTML attachment
        const adminEmailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; }
                    .header { background: #667eea; color: white; padding: 20px; }
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
                    กรุณาตรวจสอบไฟล์ HTML และรูปถ่ายที่แนบมาพร้อมอีเมลนี้
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
                        <li>✅ ใบสมัครงาน (HTML) - <strong>Job_Application_${fullname_th}_${application.id}.html</strong></li>
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
                    <strong>📌 Action Required:</strong> กรุณาดาวน์โหลดและตรวจสอบไฟล์ HTML และรูปถ่ายที่แนบมา<br>
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
            attachments  // 📎 แนบ HTML, รูปถ่าย และ Resume
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