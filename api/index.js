// api/index.js - Complete Vercel Serverless Function with PDF
// ====================================================

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
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
// PDF GENERATION FUNCTION
// ====================================================

function generateJobApplicationPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });
            
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header with gradient effect (simulated)
            doc.rect(0, 0, doc.page.width, 100).fill('#667eea');
            
            doc.fillColor('#FFFFFF')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text('ระบบรับสมัครงาน', 50, 30);
            
            doc.fontSize(14)
               .font('Helvetica')
               .text('Job Application Form - ใบสมัครงาน', 50, 65);
            
            // Reset color and position
            doc.fillColor('#000000');
            let yPos = 130;
            
            // Application ID
            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Application ID: ${data.id}`, 50, yPos)
               .text(`Date: ${new Date().toLocaleDateString('th-TH')}`, 400, yPos);
            
            yPos += 30;
            
            // Section: Personal Information
            addSectionHeader(doc, 'Personal Information - ข้อมูลส่วนตัว', yPos);
            yPos += 25;
            
            addField(doc, 'Position Applied - ตำแหน่งที่สมัคร:', data.position, yPos);
            yPos += 20;
            addField(doc, 'Full Name (Thai):', data.personal_info.fullname_th, yPos);
            yPos += 20;
            if (data.personal_info.fullname_en) {
                addField(doc, 'Full Name (English):', data.personal_info.fullname_en, yPos);
                yPos += 20;
            }
            addField(doc, 'Gender - เพศ:', data.personal_info.gender, yPos);
            yPos += 20;
            addField(doc, 'Date of Birth:', data.personal_info.birthdate, yPos);
            doc.fontSize(10).text(`(Age: ${data.personal_info.age} years)`, 300, yPos);
            yPos += 20;
            addField(doc, 'Nationality - สัญชาติ:', data.personal_info.nationality, yPos);
            yPos += 20;
            addField(doc, 'Ethnicity - เชื้อชาติ:', data.personal_info.ethnicity, yPos);
            yPos += 20;
            addField(doc, 'Religion - ศาสนา:', data.personal_info.religion, yPos);
            yPos += 20;
            addField(doc, 'ID Card Number:', data.personal_info.id_card, yPos);
            yPos += 20;
            addField(doc, 'Phone:', data.personal_info.phone, yPos);
            yPos += 20;
            addField(doc, 'LINE ID:', data.personal_info.line_id, yPos);
            yPos += 20;
            addField(doc, 'Email:', data.personal_info.email, yPos);
            yPos += 20;
            addField(doc, 'Address:', data.personal_info.address.full, yPos);
            yPos += 20;
            addField(doc, 'Location:', 
                `${data.personal_info.address.subdistrict}, ${data.personal_info.address.district}, ${data.personal_info.address.province} ${data.personal_info.address.zipcode}`, 
                yPos
            );
            yPos += 30;
            
            // Check if new page needed
            if (yPos > 650) {
                doc.addPage();
                yPos = 50;
            }
            
            // Section: Education
            addSectionHeader(doc, 'Education - การศึกษา', yPos);
            yPos += 25;
            
            if (data.education.high_school.school) {
                addField(doc, 'High School:', 
                    `${data.education.high_school.school} (${data.education.high_school.major || '-'}) - ${data.education.high_school.year || '-'}`, 
                    yPos
                );
                yPos += 20;
            }
            
            if (data.education.vocational.school) {
                addField(doc, 'Vocational:', 
                    `${data.education.vocational.school} (${data.education.vocational.major || '-'}) - ${data.education.vocational.year || '-'}`, 
                    yPos
                );
                yPos += 20;
            }
            
            if (data.education.bachelor.school) {
                addField(doc, 'Bachelor Degree:', 
                    `${data.education.bachelor.school} (${data.education.bachelor.major || '-'}) - ${data.education.bachelor.year || '-'}`, 
                    yPos
                );
                yPos += 20;
            }
            
            if (data.education.other.school) {
                addField(doc, 'Other:', 
                    `${data.education.other.school} (${data.education.other.major || '-'}) - ${data.education.other.year || '-'}`, 
                    yPos
                );
                yPos += 20;
            }

            if (data.education.education_used) {
                addField(doc, 'Education Used for Application:', data.education.education_used, yPos);
                yPos += 20;
            }
            
            yPos += 10;
            
            // Check if new page needed
            if (yPos > 650) {
                doc.addPage();
                yPos = 50;
            }
            
            // Section: Work Experience
            addSectionHeader(doc, 'Work Experience - ประสบการณ์การทำงาน', yPos);
            yPos += 25;
            
            if (data.work_experience.length > 0) {
                data.work_experience.forEach((work, index) => {
                    doc.fontSize(11)
                       .fillColor('#667eea')
                       .font('Helvetica-Bold')
                       .text(`Experience ${index + 1}:`, 50, yPos);
                    
                    yPos += 18;
                    addField(doc, 'Company:', work.company, yPos);
                    yPos += 20;
                    addField(doc, 'Position:', work.position || '-', yPos);
                    yPos += 20;
                    addField(doc, 'Duration:', `${work.start || '-'} to ${work.end || '-'}`, yPos);
                    yPos += 20;
                    addField(doc, 'Reason for Leaving:', work.reason || '-', yPos);
                    yPos += 25;
                    
                    // Check if new page needed
                    if (yPos > 650) {
                        doc.addPage();
                        yPos = 50;
                    }
                });
            } else {
                doc.fontSize(10)
                   .fillColor('#666666')
                   .font('Helvetica')
                   .text('No work experience provided', 50, yPos);
                yPos += 25;
            }
            
            // Section: Additional Information
            if (yPos > 600) {
                doc.addPage();
                yPos = 50;
            }
            
            addSectionHeader(doc, 'Additional Information - ข้อมูลเพิ่มเติม', yPos);
            yPos += 25;

            // Health Information
            if (data.additional_info.has_disease) {
                addField(doc, 'มีโรคประจำตัวหรือไม่:', data.additional_info.has_disease, yPos);
                yPos += 20;
                
                if (data.additional_info.disease_detail) {
                    addField(doc, 'รายละเอียดโรคประจำตัว:', data.additional_info.disease_detail, yPos);
                    yPos += 20;
                }
            }

            // Criminal Record
            if (data.additional_info.has_criminal_record) {
                addField(doc, 'เคยต้องโทษหรือไม่:', data.additional_info.has_criminal_record, yPos);
                yPos += 20;
                
                if (data.additional_info.criminal_detail) {
                    addField(doc, 'รายละเอียดคดี:', data.additional_info.criminal_detail, yPos);
                    yPos += 20;
                }
            }
            
            if (data.additional_info.special_skills) {
                addField(doc, 'Special Skills:', data.additional_info.special_skills, yPos);
                yPos += 20;
            }
            
            if (data.additional_info.expected_salary) {
                addField(doc, 'Expected Salary:', `${data.additional_info.expected_salary} THB`, yPos);
                yPos += 20;
            }
            
            if (data.additional_info.start_date) {
                addField(doc, 'Available Start Date:', data.additional_info.start_date, yPos);
                yPos += 20;
            }
            
            if (data.additional_info.motivation) {
                doc.fontSize(10)
                   .fillColor('#000000')
                   .font('Helvetica-Bold')
                   .text('Motivation:', 50, yPos);
                
                yPos += 15;
                doc.fontSize(10)
                   .fillColor('#333333')
                   .font('Helvetica')
                   .text(data.additional_info.motivation, 50, yPos, { 
                       width: 495, 
                       align: 'left' 
                   });
            }
            
            // Footer
            doc.fontSize(8)
               .fillColor('#999999')
               .text('Generated by Job Application System', 50, 750, { align: 'center' });
            
            doc.end();
            
            // Helper functions
            function addSectionHeader(doc, title, y) {
                doc.fontSize(14)
                   .fillColor('#667eea')
                   .font('Helvetica-Bold')
                   .text(title, 50, y);
                
                doc.moveTo(50, y + 18)
                   .lineTo(545, y + 18)
                   .strokeColor('#667eea')
                   .lineWidth(2)
                   .stroke();
            }
            
            function addField(doc, label, value, y) {
                doc.fontSize(10)
                   .fillColor('#000000')
                   .font('Helvetica-Bold')
                   .text(label, 50, y);
                
                doc.fontSize(10)
                   .fillColor('#333333')
                   .font('Helvetica')
                   .text(value || '-', 180, y, { width: 365 });
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
            // Education
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
            // Work Experience
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
            // Additional Info
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

        // Validate ID card (must be exactly 13 digits)
        const idCardDigits = id_card.replace(/\D/g, '');
        if (idCardDigits.length !== 13) {
            return res.status(400).json({
                success: false,
                message: 'หมายเลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }

        // Check if photo is uploaded
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
        
        // Generate PDF
        console.log('Generating PDF...');
        const pdfBuffer = await generateJobApplicationPDF(application);
        console.log('PDF generated successfully');
        
        // Prepare attachments for admin email
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
        
        await sendEmail(
            email, 
            '🎉 ยืนยันการรับใบสมัครงาน', 
            applicantEmailHTML
        );
        
        // Send notification email to admin with PDF attachment
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
                    <h3>📎 ไฟล์ที่แนบมา:</h3>
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
                    <em>และติดต่อผู้สมัครภายใน 7 วันทำการ</em>
                </p>
            </body>
            </html>
        `;
        
        console.log('Sending email to admin...');
        await sendEmail(
            process.env.ADMIN_EMAIL || 'forcon674@outlook.com',
            `🆕 ใบสมัครงานใหม่ - ${position} - ${fullname_th}`,
            adminEmailHTML,
            attachments  // 📎 แนบ PDF, รูปถ่าย และ Resume
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