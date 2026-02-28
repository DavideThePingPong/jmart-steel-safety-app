// Training Certificate PDF Generator
// Extracted from training.jsx — jsPDF-based professional certificate layout

const TrainingCertGenerator = {
  generate(workerName, selectedCourse, signatureData, calculateScore) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();  // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 15;

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
      const certId = 'JMS-' + now.getFullYear() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();

      // Professional Color Palette
      const navy = [15, 23, 42];
      const gold = [212, 175, 55];
      const darkGold = [180, 140, 40];
      const orange = [234, 88, 12];
      const darkOrange = [194, 65, 12];
      const white = [255, 255, 255];
      const lightGray = [248, 250, 252];
      const medGray = [100, 116, 139];
      const darkGray = [51, 65, 85];
      const green = [22, 163, 74];
      const lightGreen = [240, 253, 244];

      // === ELEGANT BORDER DESIGN ===
      // Outer gold border
      doc.setDrawColor(...gold);
      doc.setLineWidth(1.5);
      doc.rect(margin - 3, margin - 3, pageWidth - margin * 2 + 6, pageHeight - margin * 2 + 6);

      // Inner navy border
      doc.setDrawColor(...navy);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

      // Corner decorations (small gold squares)
      doc.setFillColor(...gold);
      const cornerSize = 4;
      doc.rect(margin - 3, margin - 3, cornerSize, cornerSize, 'F');
      doc.rect(pageWidth - margin - 1, margin - 3, cornerSize, cornerSize, 'F');
      doc.rect(margin - 3, pageHeight - margin - 1, cornerSize, cornerSize, 'F');
      doc.rect(pageWidth - margin - 1, pageHeight - margin - 1, cornerSize, cornerSize, 'F');

      // === HEADER BANNER ===
      let y = margin + 5;

      // Navy header background
      doc.setFillColor(...navy);
      doc.rect(margin, margin, pageWidth - margin * 2, 35, 'F');

      // Company name
      doc.setFontSize(32);
      doc.setTextColor(...white);
      doc.setFont(undefined, 'bold');
      doc.text('JMART STEEL', pageWidth / 2, y + 12, { align: 'center' });

      // Gold underline
      doc.setDrawColor(...gold);
      doc.setLineWidth(1);
      doc.line(pageWidth / 2 - 45, y + 17, pageWidth / 2 + 45, y + 17);

      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(...gold);
      doc.setFont(undefined, 'normal');
      doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, y + 25, { align: 'center' });

      y = margin + 45;

      // === CERTIFICATE BODY ===
      doc.setFontSize(11);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('This is to certify that', pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Worker Name - prominent
      doc.setFontSize(28);
      doc.setTextColor(...navy);
      doc.setFont(undefined, 'bold');
      doc.text(workerName || 'Worker Name', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Gold line under name
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.8);
      doc.line(pageWidth / 2 - 50, y, pageWidth / 2 + 50, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('has successfully completed the safety training course', pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Course Title - prominent orange
      const courseTitle = selectedCourse.title.split(' / ')[0];
      doc.setFontSize(20);
      doc.setTextColor(...orange);
      doc.setFont(undefined, 'bold');
      doc.text(courseTitle, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Score badge - green pill
      doc.setFillColor(...green);
      const badgeWidth = 55;
      const badgeHeight = 10;
      doc.roundedRect(pageWidth / 2 - badgeWidth / 2, y - 7, badgeWidth, badgeHeight, 5, 5, 'F');
      doc.setFontSize(11);
      doc.setTextColor(...white);
      doc.setFont(undefined, 'bold');
      const scoreText = typeof calculateScore === 'number' ? 'PASSED  •  ' + Math.round(calculateScore) + '%' : 'PASSED  •  100%';
      doc.text(scoreText, pageWidth / 2, y, { align: 'center' });
      y += 14;

      // === INFO ROW ===
      const leftCol = pageWidth / 3;
      const rightCol = (pageWidth / 3) * 2;

      doc.setFillColor(...lightGray);
      doc.roundedRect(margin + 10, y - 4, pageWidth - margin * 2 - 20, 18, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('DATE COMPLETED', leftCol, y + 2, { align: 'center' });
      doc.text('COURSE DURATION', rightCol, y + 2, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(...navy);
      doc.setFont(undefined, 'bold');
      doc.text(dateStr, leftCol, y + 10, { align: 'center' });
      doc.text(selectedCourse.duration + '  •  ' + selectedCourse.questions.length + ' Questions', rightCol, y + 10, { align: 'center' });
      y += 22;

      // === ASSESSMENT RESULTS SECTION ===
      const questionCount = selectedCourse.questions.length;
      const rowsNeeded = Math.ceil(questionCount / 2);
      const questionsBoxHeight = rowsNeeded * 7 + 18;

      // Light green background with border
      doc.setFillColor(...lightGreen);
      doc.roundedRect(margin + 10, y, pageWidth - margin * 2 - 20, questionsBoxHeight, 3, 3, 'F');
      doc.setDrawColor(...green);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin + 10, y, pageWidth - margin * 2 - 20, questionsBoxHeight, 3, 3, 'S');

      // Header
      doc.setFontSize(10);
      doc.setTextColor(...green);
      doc.setFont(undefined, 'bold');
      doc.text('ASSESSMENT COMPLETED  —  ALL QUESTIONS CORRECT', pageWidth / 2, y + 8, { align: 'center' });

      // Questions in two columns
      const col1X = margin + 18;
      const col2X = pageWidth / 2 + 5;
      let qY = y + 16;

      doc.setFontSize(7.5);
      selectedCourse.questions.forEach((q, idx) => {
        const questionText = q.question.split(' / ')[0];
        const truncatedQ = questionText.length > 48 ? questionText.substring(0, 45) + '...' : questionText;
        const xPos = idx % 2 === 0 ? col1X : col2X;
        const yPos = qY + Math.floor(idx / 2) * 7;

        // Green checkmark
        doc.setTextColor(...green);
        doc.setFont(undefined, 'bold');
        doc.text('✓', xPos, yPos);

        // Question text
        doc.setTextColor(...darkGray);
        doc.setFont(undefined, 'normal');
        doc.text('Q' + (idx + 1) + ': ' + truncatedQ, xPos + 5, yPos);
      });

      y += questionsBoxHeight + 6;

      // === AUSTRALIAN STANDARDS SECTION ===
      const standardsCount = selectedCourse.standards ? selectedCourse.standards.length : 1;
      const standardsBoxHeight = standardsCount * 6 + 18;

      // Dark orange/burnt orange background
      doc.setFillColor(...darkOrange);
      doc.roundedRect(margin + 10, y, pageWidth - margin * 2 - 20, standardsBoxHeight, 3, 3, 'F');

      // Gold accent line at top
      doc.setDrawColor(...gold);
      doc.setLineWidth(1.5);
      doc.line(margin + 10, y, pageWidth - margin - 10, y);

      // Header
      doc.setFontSize(11);
      doc.setTextColor(...white);
      doc.setFont(undefined, 'bold');
      doc.text('AUSTRALIAN STANDARDS REFERENCED', pageWidth / 2, y + 9, { align: 'center' });

      // Standards list
      doc.setFontSize(8.5);
      doc.setFont(undefined, 'normal');
      let stdY = y + 17;
      if (selectedCourse.standards && selectedCourse.standards.length > 0) {
        selectedCourse.standards.forEach((s) => {
          doc.text('•  ' + s.code, pageWidth / 2, stdY, { align: 'center' });
          stdY += 6;
        });
      } else {
        doc.text('•  Safe Work Australia - General WHS Guidelines', pageWidth / 2, stdY, { align: 'center' });
      }

      y += standardsBoxHeight + 12;

      // === SIGNATURE SECTION ===
      const sigY = y;
      const sigLeftCol = pageWidth / 4 + 5;
      const sigRightCol = (pageWidth / 4) * 3 - 5;

      // Left - Worker Signature
      doc.setFontSize(8);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('WORKER SIGNATURE', sigLeftCol, sigY, { align: 'center' });

      // Signature image
      if (signatureData) {
        try {
          doc.addImage(signatureData, 'PNG', sigLeftCol - 25, sigY + 3, 50, 18);
        } catch (e) {
          console.log('Could not add worker signature:', e);
        }
      }

      // Signature line
      doc.setDrawColor(...navy);
      doc.setLineWidth(0.5);
      doc.line(sigLeftCol - 35, sigY + 24, sigLeftCol + 35, sigY + 24);

      // Name
      doc.setFontSize(10);
      doc.setTextColor(...navy);
      doc.setFont(undefined, 'bold');
      doc.text(workerName || 'Worker Name', sigLeftCol, sigY + 32, { align: 'center' });

      // Right - Authorizing Signature
      doc.setFontSize(8);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('AUTHORIZED BY', sigRightCol, sigY, { align: 'center' });

      // Try to get Scott's signature
      let scottSigAdded = false;
      try {
        const teamSigs = localStorage.getItem('jmart-team-signatures');
        if (teamSigs) {
          const sigs = JSON.parse(teamSigs);
          if (sigs['Scott Seeho'] && sigs['Scott Seeho'].startsWith('data:image')) {
            doc.addImage(sigs['Scott Seeho'], 'PNG', sigRightCol - 25, sigY + 3, 50, 18);
            scottSigAdded = true;
          }
        }
      } catch (e) {
        console.log('Could not add Scott signature:', e);
      }

      // Signature line
      doc.line(sigRightCol - 35, sigY + 24, sigRightCol + 35, sigY + 24);

      // Name and title
      doc.setFontSize(10);
      doc.setTextColor(...navy);
      doc.setFont(undefined, 'bold');
      doc.text('Scott Seeho', sigRightCol, sigY + 32, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('General Manager  •  J&M Artsteel', sigRightCol, sigY + 38, { align: 'center' });

      // === FOOTER ===
      // Gold line above footer
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.5);
      doc.line(margin + 20, pageHeight - 28, pageWidth - margin - 20, pageHeight - 28);

      doc.setFontSize(7);
      doc.setTextColor(...medGray);
      doc.setFont(undefined, 'normal');
      doc.text('Certificate ID: ' + certId, pageWidth / 2, pageHeight - 22, { align: 'center' });
      doc.text('This certificate confirms completion of safety training in accordance with Work Health & Safety requirements.', pageWidth / 2, pageHeight - 17, { align: 'center' });
      doc.text('Valid for 12 months from date of issue.  •  J&M Artsteel Pty Ltd  •  ABN XX XXX XXX XXX', pageWidth / 2, pageHeight - 12, { align: 'center' });

      // Save the PDF
      const fileName = 'JMart-Certificate-' + selectedCourse.id + '-' + workerName.replace(/\s+/g, '-') + '.pdf';
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      alert('Error generating certificate. Please try again.');
    }
  }
};
