// ========================================
// PDF GENERATOR - Professional Layout
// Uses PDFConfig for labels, colors, and mappings
// ========================================
const PDFGenerator = {
  // Delegate to PDFConfig
  get folderMap() { return PDFConfig.folderMap; },
  get fieldLabels() { return PDFConfig.fieldLabels; },
  get checklistLabels() { return PDFConfig.checklistLabels; },
  get colors() { return PDFConfig.colors; },

  generate: function(form) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    const type = form.type || 'unknown';
    const folderName = this.folderMap[type] || type;
    const date = new Date(form.createdAt || Date.now());
    const dateStr = date.toLocaleDateString('en-AU').replace(/\//g, '-');

    let y = 0;

    // === HELPERS (closures over doc, y, margin, contentWidth) ===

    const checkPageBreak = (needed = 20) => {
      if (y > pageHeight - needed - 20) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    };

    const drawSectionHeader = (title) => {
      checkPageBreak(25);
      doc.setFillColor(...this.colors.lightGray);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      doc.setTextColor(...this.colors.dark);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin + 5, y + 7);
      doc.setFont(undefined, 'normal');
      y += 15;
    };

    const drawField = (label, value, fullWidth = false) => {
      if (!value && value !== false && value !== 0) return;
      checkPageBreak(15);
      const displayLabel = this.fieldLabels[label] || label.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const displayValue = String(value);
      doc.setFontSize(9);
      doc.setTextColor(...this.colors.gray);
      doc.text(displayLabel, margin + 3, y);
      doc.setFontSize(10);
      doc.setTextColor(...this.colors.dark);
      const maxWidth = fullWidth ? contentWidth - 6 : contentWidth / 2 - 10;
      const lines = doc.splitTextToSize(displayValue, maxWidth);
      doc.text(lines, margin + 3, y + 5);
      y += 5 + (lines.length * 5) + 3;
    };

    const drawFieldPair = (label1, value1, label2, value2) => {
      if ((!value1 && value1 !== false) && (!value2 && value2 !== false)) return;
      checkPageBreak(15);
      const halfWidth = contentWidth / 2;
      if (value1 || value1 === false) {
        const displayLabel1 = this.fieldLabels[label1] || label1.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        doc.setFontSize(9);
        doc.setTextColor(...this.colors.gray);
        doc.text(displayLabel1, margin + 3, y);
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.dark);
        doc.text(String(value1), margin + 3, y + 5);
      }
      if (value2 || value2 === false) {
        const displayLabel2 = this.fieldLabels[label2] || label2.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        doc.setFontSize(9);
        doc.setTextColor(...this.colors.gray);
        doc.text(displayLabel2, margin + halfWidth + 3, y);
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.dark);
        doc.text(String(value2), margin + halfWidth + 3, y + 5);
      }
      y += 15;
    };

    const drawComplexField = (label, fieldData) => {
      if (!fieldData) return;
      let value = fieldData;
      let notes = [];
      let media = [];
      if (typeof fieldData === 'object' && !Array.isArray(fieldData)) {
        value = fieldData.value || '';
        notes = fieldData.notes || [];
        media = fieldData.media || [];
      }
      if (!value && notes.length === 0 && media.length === 0) return;
      checkPageBreak(25);

      const displayLabel = this.fieldLabels[label] || label;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...this.colors.primary);
      doc.text(displayLabel, margin + 3, y);
      doc.setFont(undefined, 'normal');
      y += 6;

      if (value) {
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.dark);
        const lines = doc.splitTextToSize(String(value), contentWidth - 10);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 3;
      }

      if (notes && notes.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(8);
        doc.setTextColor(...this.colors.gray);
        doc.text('Notes:', margin + 5, y);
        y += 4;
        notes.forEach((note) => {
          checkPageBreak(10);
          doc.setFillColor(240, 248, 255);
          const noteLines = doc.splitTextToSize('• ' + note, contentWidth - 15);
          const noteHeight = noteLines.length * 4 + 4;
          doc.roundedRect(margin + 5, y - 2, contentWidth - 10, noteHeight, 1, 1, 'F');
          doc.setFontSize(9);
          doc.setTextColor(30, 64, 175);
          doc.text(noteLines, margin + 8, y + 2);
          y += noteHeight + 2;
        });
      }

      if (media && media.length > 0) {
        checkPageBreak(45);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...this.colors.gray);
        doc.text('Attached Photos (' + media.length + '):', margin + 5, y);
        doc.setFont(undefined, 'normal');
        y += 8;

        const imgWidth = 45;
        const imgHeight = 35;
        const imgsPerRow = 3;
        let imgX = margin + 5;
        let imgCount = 0;

        media.forEach((item, idx) => {
          if (item.data && item.data.startsWith('data:image')) {
            try {
              checkPageBreak(imgHeight + 15);
              let imgFormat = 'PNG';
              if (item.data.includes('image/jpeg') || item.data.includes('image/jpg')) imgFormat = 'JPEG';
              else if (item.data.includes('image/png')) imgFormat = 'PNG';

              doc.setDrawColor(...this.colors.lightGray);
              doc.setLineWidth(0.5);
              doc.roundedRect(imgX - 1, y - 1, imgWidth + 2, imgHeight + 2, 2, 2, 'S');
              doc.addImage(item.data, imgFormat, imgX, y, imgWidth, imgHeight);

              doc.setFontSize(7);
              doc.setTextColor(...this.colors.dark);
              const imgLabel = item.name ? item.name.substring(0, 20) : 'Photo ' + (idx + 1);
              doc.text(imgLabel, imgX, y + imgHeight + 5);

              imgX += imgWidth + 10;
              imgCount++;
              if (imgCount >= imgsPerRow) {
                imgX = margin + 5;
                imgCount = 0;
                y += imgHeight + 12;
              }
            } catch (e) {
              doc.setDrawColor(...this.colors.gray);
              doc.setFillColor(245, 245, 245);
              doc.roundedRect(imgX, y, imgWidth, imgHeight, 2, 2, 'FD');
              doc.setFontSize(8);
              doc.setTextColor(...this.colors.gray);
              doc.text('Photo ' + (idx + 1), imgX + 10, y + imgHeight/2);
              imgX += imgWidth + 10;
              imgCount++;
            }
          }
        });

        if (imgCount > 0) y += imgHeight + 8;
      }
      y += 5;
    };

    const drawSignatureBlock = (sigData, label, nameValue) => {
      if (!sigData || !sigData.startsWith('data:image')) return;
      checkPageBreak(40);
      drawSectionHeader(label);
      try {
        doc.addImage(sigData, 'PNG', margin + 3, y, 50, 20);
        y += 25;
        if (nameValue) {
          doc.setFontSize(9);
          doc.setTextColor(...this.colors.gray);
          doc.text(nameValue, margin + 3, y);
          y += 5;
        }
      } catch (e) {
        doc.setFontSize(9);
        doc.setTextColor(...this.colors.gray);
        doc.text('[Signature recorded]', margin + 3, y);
        y += 10;
      }
    };

    // ========== HEADER ==========
    doc.setFillColor(...this.colors.primary);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(...this.colors.white);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('JMART STEEL', margin, 14);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(folderName.toUpperCase(), margin, 24);
    doc.setFontSize(9);
    doc.text(date.toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, 14, { align: 'right' });
    doc.text(date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }), pageWidth - margin, 22, { align: 'right' });
    y = 42;

    // ========== FORM CONTENT ==========
    const data = form.data || {};

    // Site Details
    if (data.supervisorName || data.siteConducted || data.builder || data.address || data.preparedBy || data.location) {
      drawSectionHeader('SITE DETAILS');
      drawFieldPair('supervisorName', data.supervisorName || data.preparedBy, 'siteConducted', data.siteConducted);
      drawFieldPair('builder', data.builder, 'address', data.address);
      if (data.location) drawFieldPair('location', data.location, 'jobStructure', data.jobStructure);
      if (data.conductedOn) drawField('conductedOn', new Date(data.conductedOn).toLocaleDateString('en-AU'));
    }

    // Work Information (Pre-Start)
    if (data.workAreas || data.taskToComplete || data.tasksThisShift || data.machineryControls) {
      drawSectionHeader('WORK INFORMATION');
      drawComplexField('Work Areas', data.workAreas);
      drawComplexField('Tasks This Shift', data.tasksThisShift);
      drawComplexField('Machinery & Controls', data.machineryControls);
      if (data.taskToComplete) drawField('taskToComplete', data.taskToComplete, true);
    }

    // Safety Information
    if (data.plantEquipment !== undefined || data.isPlantEquipmentUsed !== undefined || data.siteHazards || data.permitsRequired || data.highRiskWorks !== undefined || data.swmsCovered !== undefined || data.worksCoveredBySWMS !== undefined) {
      drawSectionHeader('SAFETY INFORMATION');
      const plantUsed = data.plantEquipment !== undefined ? data.plantEquipment : data.isPlantEquipmentUsed;
      const swmsCovered = data.swmsCovered !== undefined ? data.swmsCovered : data.worksCoveredBySWMS;
      const safetyIssues = data.safetyIssues !== undefined ? data.safetyIssues : data.hasSafetyIssues;
      drawFieldPair('Plant/Equipment Used', plantUsed ? 'Yes' : 'No', 'High Risk Works', data.highRiskWorks ? 'Yes' : 'No');
      drawFieldPair('Works Covered by SWMS', swmsCovered ? 'Yes' : 'No', 'Safety Issues', safetyIssues ? 'Yes' : 'No');
      drawComplexField('Site Hazards', data.siteHazards);
      drawComplexField('Permits Required', data.permitsRequired);
      drawComplexField('Safety Issues Previous Shift', data.safetyIssuesPreviousShift);
      if (data.translatorRequired !== undefined) drawField('Translator Required', data.translatorRequired ? 'Yes' : 'No');
      if (data.translatorName) drawField('Translator Name', data.translatorName);
    }

    // Checklist Section
    const checklistData = data.checklist || data.checks;
    if (checklistData && typeof checklistData === 'object') {
      const checklistHeader = data.checkType ? data.checkType.toUpperCase() + ' CHECKLIST' : 'SAFETY CHECKLIST';
      drawSectionHeader(checklistHeader);

      const checklistItems = Object.entries(checklistData);
      const colWidth = contentWidth / 2;
      let col = 0;

      checklistItems.forEach(([key, value]) => {
        const itemLabel = this.checklistLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        const xPos = margin + (col * colWidth) + 3;

        doc.setDrawColor(...this.colors.gray);
        doc.setLineWidth(0.3);
        doc.rect(xPos, y - 3, 4, 4);

        if (value === true || value === 'yes' || value === 'Yes') {
          doc.setFillColor(...this.colors.success);
          doc.rect(xPos + 0.5, y - 2.5, 3, 3, 'F');
          doc.setTextColor(...this.colors.success);
          doc.setFontSize(8);
          doc.text('✓', xPos + 1, y + 0.5);
        } else if (value === false || value === 'no' || value === 'No') {
          doc.setFillColor(...this.colors.danger);
          doc.rect(xPos + 0.5, y - 2.5, 3, 3, 'F');
          doc.setTextColor(...this.colors.danger);
          doc.setFontSize(8);
          doc.text('✗', xPos + 1, y + 0.5);
        }

        doc.setTextColor(...this.colors.dark);
        doc.setFontSize(9);
        const truncLabel = itemLabel.length > 35 ? itemLabel.substring(0, 35) + '...' : itemLabel;
        doc.text(truncLabel, xPos + 7, y);

        col++;
        if (col >= 2) { col = 0; y += 8; checkPageBreak(10); }
      });

      if (col !== 0) y += 8;
      y += 5;
    }

    // Incident-specific fields
    if (type === 'incident') {
      if (data.incidentDate || data.incidentTime || data.incidentType) {
        drawSectionHeader('INCIDENT DETAILS');
        drawFieldPair('incidentDate', data.incidentDate, 'incidentTime', data.incidentTime);
        if (data.incidentType) drawField('incidentType', data.incidentType, true);
      }
      if (data.description) { drawSectionHeader('DESCRIPTION'); drawField('description', data.description, true); }
      if (data.actionTaken) { drawSectionHeader('ACTION TAKEN'); drawField('actionTaken', data.actionTaken, true); }
      if (data.injuries) drawField('injuries', data.injuries, true);
      if (data.witnesses) drawField('witnesses', data.witnesses, true);
    }

    // Toolbox-specific fields
    if (type === 'toolbox') {
      if (data.topic || data.topics) {
        drawSectionHeader('TOOLBOX TALK DETAILS');
        if (data.topics && Array.isArray(data.topics)) drawField('Topics Covered', data.topics.join(', '), true);
        if (data.topic) drawField('topic', data.topic, true);
        if (data.otherTopic) drawField('Other Topic', data.otherTopic, true);
      }
      if (data.correctiveAction) drawField('Corrective Action', data.correctiveAction, true);
      if (data.feedbackResponses) drawField('Feedback & Responses', data.feedbackResponses, true);
      if (data.keyPoints) drawField('keyPoints', data.keyPoints, true);
      if (data.attendees) drawField('attendees', data.attendees, true);
    }

    // ITP-specific fields (Glass and Steel ITP)
    if (type === 'itp' || type === 'steel-itp') {
      if (data.preConstructionMeeting !== undefined || data.preConstMeeting !== undefined || data.highRiskWorkshop !== undefined || data.shopdrawingsApproved !== undefined) {
        drawSectionHeader('PRE-CONSTRUCTION');
        drawFieldPair('Pre-Construction Meeting', data.preConstructionMeeting || data.preConstMeeting, 'High Risk Workshop', data.highRiskWorkshop);
        drawFieldPair('Shop Drawings Approved', data.shopdrawingsApproved, 'All Items Signed Off', data.allItemsSignedOff);
        if (data.shopdrawingRevision) drawField('Shop Drawing Revision', data.shopdrawingRevision, true);
      }
      if (data.materialsOrdered !== undefined || data.materialsCorrect !== undefined) {
        drawSectionHeader('FABRICATION');
        drawFieldPair('Materials Ordered', data.materialsOrdered, 'Materials Correct', data.materialsCorrect);
        drawFieldPair('Visual Check', data.visualCheck, 'Shop Drawings Current', data.shopdrawingsCurrent);
        drawFieldPair('Setout Correct', data.setoutCorrect, 'Tack Weld', data.tackWeld);
        drawFieldPair('Fully Welded', data.fullyWelded, 'Pack Load', data.packLoad);
      }
      if (data.finishConfirmed !== undefined || data.deliveryBooked !== undefined) {
        drawSectionHeader('SURFACE FINISH');
        drawFieldPair('Finish Confirmed', data.finishConfirmed, 'Delivery Booked', data.deliveryBooked);
        drawFieldPair('Sent to Painter', data.sentToPainter, 'Delivery Vehicle', data.deliveryVehicle);
        if (data.afterDeliveryFinish) drawField('After Delivery Finish', data.afterDeliveryFinish);
      }
      if (data.orderedGlassFrom || data.glassSpecification) {
        drawSectionHeader('GLASS SPECIFICATION');
        drawFieldPair('Ordered Glass From', data.orderedGlassFrom, 'Glass Specification', data.glassSpecification);
        drawFieldPair('Glass Free From Damage', data.glassFreeFromDamage ? 'Yes' : 'No', 'Specification of Fixings', data.specificationOfFixings);
      }
      if (data.installationMethod || data.setoutCompletedBy || data.surveyorMeasurements !== undefined) {
        drawSectionHeader('INSTALLATION');
        drawFieldPair('Setout Completed By', data.setoutCompletedBy, 'Installation Method', data.installationMethod);
        drawFieldPair('Drawings Confirmed', data.drawingsConfirmed, 'Surveyor Measurements', data.surveyorMeasurements);
        if (data.surveyorName) drawField('Surveyor Name', data.surveyorName);
        if (data.clashesDetected) drawField('Clashes Detected', data.clashesDetected);
      }
      if (data.glassInstalledCorrectRL !== undefined || data.glassLockedWedgedGlued !== undefined) {
        drawSectionHeader('GLASS INSTALLATION');
        drawFieldPair('Glass Installed Correct RL', data.glassInstalledCorrectRL ? 'Yes' : 'No', 'Glass Locked/Wedged/Glued', data.glassLockedWedgedGlued ? 'Yes' : 'No');
        if (data.removeWedgesCaulk) drawField('Remove Wedges & Caulk', data.removeWedgesCaulk);
      }
      if (data.chemicalAnchors !== undefined || data.anchorsInstalled !== undefined) {
        drawSectionHeader('ANCHORING & FIXING');
        drawFieldPair('Chemical Anchors', data.chemicalAnchors, 'Anchors Installed', data.anchorsInstalled);
        drawFieldPair('Level & Plumb', data.levelPlumb, 'Bolts Torqued', data.boltsTorqued);
        drawFieldPair('Welding Completed', data.weldingCompleted, 'Grouting Completed', data.groutingCompleted);
      }
      if (data.handrailSpecConfirmed !== undefined || data.spigotsCouplingsTight !== undefined) {
        drawSectionHeader('HANDRAIL');
        drawFieldPair('Handrail Spec Confirmed', data.handrailSpecConfirmed ? 'Yes' : 'No', 'Spigots/Couplings Tight', data.spigotsCouplingsTight ? 'Yes' : 'No');
        drawFieldPair('Handrail Compliant Height', data.handrailCompliantHeight ? 'Yes' : 'No', 'Thread on Fixings', data.threadOnFixings ? 'Yes' : 'No');
        if (data.fullWeldingJunctions !== undefined) drawField('Full Welding Junctions', data.fullWeldingJunctions ? 'Yes' : 'No');
      }
      if (data.itemsChecked !== undefined || data.finishAcceptable !== undefined || data.allGlassNoDefects !== undefined) {
        drawSectionHeader('QUALITY CHECK');
        drawFieldPair('Items Checked', data.itemsChecked, 'Finish Acceptable', data.finishAcceptable);
        drawFieldPair('Fixings Torqued', data.fixingsTorqued, 'All Glass No Defects', data.allGlassNoDefects ? 'Yes' : 'No');
        drawFieldPair('All Handrail No Defects', data.allHandrailNoDefects ? 'Yes' : 'No', 'Balustrade As Per Design', data.balustradeAsPerDesign ? 'Yes' : 'No');
      }
      if (data.weldTestingBooked !== undefined || data.weldsPassed !== undefined) {
        drawSectionHeader('WELD TESTING');
        drawFieldPair('Weld Testing Booked', data.weldTestingBooked, 'Welds Passed', data.weldsPassed);
        if (data.testingIssues) drawField('Testing Issues', data.testingIssues, true);
      }
      if (data.colourConfirmed !== undefined || data.handoverAccepted !== undefined) {
        drawSectionHeader('FINAL CHECK & HANDOVER');
        drawFieldPair('Colour Confirmed', data.colourConfirmed, 'Defects Checked', data.defectsChecked);
        if (data.handoverAccepted !== undefined) drawField('Handover Accepted', data.handoverAccepted);
      }
      if (data.futureCorrespondence) {
        drawSectionHeader('NOTES & CORRESPONDENCE');
        drawField('Items for Future Correspondence', data.futureCorrespondence, true);
      }
    }

    // Inspection-specific fields
    if (type === 'inspection') {
      if (data.inspectionItems && typeof data.inspectionItems === 'object') {
        drawSectionHeader('INSPECTION ITEMS');
        Object.entries(data.inspectionItems).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            const itemLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
            drawField(itemLabel, value);
          }
        });
      }
    }

    // Notes/Comments
    if (data.notes || data.comments) {
      drawSectionHeader('NOTES');
      if (data.notes) drawField('notes', data.notes, true);
      if (data.comments) drawField('comments', data.comments, true);
    }

    // Workers Section (legacy array format)
    if (data.workers && Array.isArray(data.workers) && data.workers.length > 0) {
      drawSectionHeader('WORKERS ON SITE');
      data.workers.forEach((worker, idx) => {
        checkPageBreak(25);
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.dark);
        doc.text((idx + 1) + '. ' + (worker.name || 'Worker ' + (idx + 1)), margin + 3, y);
        y += 6;
        if (worker.signature && worker.signature.startsWith('data:image')) {
          try {
            doc.addImage(worker.signature, 'PNG', margin + 5, y, 40, 15);
            y += 18;
          } catch (e) {
            doc.setFontSize(8);
            doc.setTextColor(...this.colors.gray);
            doc.text('[Signature recorded]', margin + 5, y + 5);
            y += 10;
          }
        }
      });
    }

    // Team Signatures Section (object format)
    if (data.signatures && typeof data.signatures === 'object' && !Array.isArray(data.signatures)) {
      const signedMembers = Object.entries(data.signatures).filter(([name, sig]) => sig && sig.startsWith && sig.startsWith('data:image'));
      if (signedMembers.length > 0) {
        checkPageBreak(40);
        drawSectionHeader('TEAM SIGNATURES');
        const sigWidth = 55;
        const sigHeight = 22;
        const sigColWidth = contentWidth / 2;
        let col = 0;
        let rowStartY = y;

        signedMembers.forEach(([name, signature]) => {
          const xPos = margin + (col * sigColWidth);
          if (col === 0) { checkPageBreak(sigHeight + 15); rowStartY = y; }

          doc.setDrawColor(...this.colors.lightGray);
          doc.setLineWidth(0.3);
          doc.roundedRect(xPos + 2, rowStartY, sigWidth, sigHeight, 2, 2, 'S');
          try {
            doc.addImage(signature, 'PNG', xPos + 4, rowStartY + 2, sigWidth - 6, sigHeight - 8);
          } catch (e) {
            doc.setFontSize(8);
            doc.setTextColor(...this.colors.gray);
            doc.text('[Signature]', xPos + 10, rowStartY + sigHeight / 2);
          }

          doc.setFontSize(9);
          doc.setTextColor(...this.colors.dark);
          doc.setFont(undefined, 'bold');
          doc.text(name, xPos + 2, rowStartY + sigHeight + 5);
          doc.setFont(undefined, 'normal');

          col++;
          if (col >= 2) { col = 0; y = rowStartY + sigHeight + 12; }
        });

        if (col !== 0) y = rowStartY + sigHeight + 12;
        y += 5;
      }
    }

    // Individual Signature Blocks
    drawSignatureBlock(data.translatorSignature, 'TRANSLATOR SIGNATURE', data.translatorName ? 'Translator: ' + data.translatorName : null);
    drawSignatureBlock(data.completedBySignature, 'COMPLETED BY', data.completedBy);
    drawSignatureBlock(data.managerSignature, 'MANAGER APPROVAL', data.managerName);
    drawSignatureBlock(data.builderSignature, 'BUILDER SIGN-OFF', data.builderName || data.builderSignoffName);
    drawSignatureBlock(data.signature, 'SIGNATURE', data.supervisorName);

    // ========== FOOTER ==========
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...this.colors.lightGray);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(...this.colors.gray);
      doc.text('J&M Artsteel Safety App', margin, pageHeight - 8);
      doc.text('Page ' + i + ' of ' + totalPages, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text('Generated: ' + new Date().toLocaleString('en-AU'), pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    // Generate filename
    const siteName = data.siteConducted || data.site || data.siteLocation || data.jobName || 'Form';
    const safeSiteName = siteName.toString().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 30);
    const safeFormType = folderName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = safeSiteName + '_' + safeFormType + '_' + dateStr + '.pdf';

    return { doc, filename, folderName };
  },

  download: function(form) {
    const { doc, filename } = this.generate(form);
    doc.save(filename);
    return filename;
  }
};
