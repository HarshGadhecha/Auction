import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Auction, Team, Player } from '@/types';
import { formatCurrency, formatDateTime, getOrderedTeams } from '@/utils/helpers';

class PDFService {
  // Generate auction summary PDF
  async generateAuctionSummary(auction: Auction): Promise<string> {
    try {
      const html = this.generateHTML(auction);

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('PDF generated:', uri);
      return uri;
    } catch (error) {
      console.error('Generate PDF error:', error);
      throw error;
    }
  }

  // Share PDF
  async sharePDF(uri: string, filename: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      // Copy to a user-friendly location
      const newUri = `${FileSystem.documentDirectory}${filename}.pdf`;
      await FileSystem.copyAsync({
        from: uri,
        to: newUri,
      });

      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Auction Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Share PDF error:', error);
      throw error;
    }
  }

  // Generate HTML for PDF
  private generateHTML(auction: Auction): string {
    const teams = getOrderedTeams(auction.teams);
    const players = Object.values(auction.players);

    // Calculate team-wise player allocations
    const teamPlayerMap = teams.map((team) => ({
      team,
      players: players.filter((p) => p.assignedToTeam === team.id),
    }));

    // Calculate totals
    const totalSoldPlayers = players.filter((p) => p.status === 'sold').length;
    const totalUnsoldPlayers = players.filter((p) => p.status === 'unsold').length;
    const totalAuctionAmount = players
      .filter((p) => p.status === 'sold')
      .reduce((sum, p) => sum + p.finalPrice, 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auction Summary - ${auction.auctionName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #007AFF;
      padding-bottom: 20px;
    }

    .header h1 {
      font-size: 32px;
      color: #007AFF;
      margin-bottom: 10px;
    }

    .header p {
      font-size: 14px;
      color: #666;
    }

    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      background: #f5f5f7;
      border-radius: 8px;
    }

    .info-item {
      flex: 1;
    }

    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .section-title {
      font-size: 24px;
      font-weight: bold;
      margin: 40px 0 20px 0;
      color: #007AFF;
    }

    .team-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .team-header {
      background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .team-name {
      font-size: 20px;
      font-weight: bold;
    }

    .team-stats {
      font-size: 14px;
      text-align: right;
    }

    .players-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .players-table thead {
      background: #f5f5f7;
    }

    .players-table th {
      padding: 12px 15px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .players-table td {
      padding: 12px 15px;
      border-top: 1px solid #e5e5e7;
      font-size: 14px;
    }

    .players-table tr:hover {
      background: #f9f9f9;
    }

    .price-cell {
      font-weight: 600;
      color: #34C759;
    }

    .team-total {
      background: #f5f5f7;
      padding: 15px 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .summary-section {
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
      color: white;
      border-radius: 12px;
      page-break-inside: avoid;
    }

    .summary-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .summary-item {
      text-align: center;
    }

    .summary-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .summary-label {
      font-size: 14px;
      opacity: 0.9;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e7;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    @media print {
      body {
        padding: 20px;
      }

      .team-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>${auction.auctionName}</h1>
    <p>Auction Summary Report</p>
    <p>Generated on ${new Date().toLocaleDateString()}</p>
  </div>

  <!-- Auction Info -->
  <div class="info-section">
    <div class="info-item">
      <div class="info-label">Date & Time</div>
      <div class="info-value">${formatDateTime(auction.auctionDate)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Venue</div>
      <div class="info-value">${auction.venue}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Sport Type</div>
      <div class="info-value">${auction.sportType}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Auction Type</div>
      <div class="info-value">${this.getAuctionTypeLabel(auction.auctionType)}</div>
    </div>
  </div>

  <!-- Team Breakdown -->
  <h2 class="section-title">Team-wise Player Allocation</h2>

  ${teamPlayerMap
    .map(
      ({ team, players }) => `
    <div class="team-section">
      <div class="team-header">
        <div class="team-name">${team.name}</div>
        <div class="team-stats">
          ${players.length} Players |
          ${formatCurrency(auction.totalCreditsPerTeam - team.remainingCredits)} Spent |
          ${formatCurrency(team.remainingCredits)} Remaining
        </div>
      </div>

      ${
        players.length > 0
          ? `
      <table class="players-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player Name</th>
            <th>Position</th>
            <th>Base Price</th>
            <th>Final Price</th>
          </tr>
        </thead>
        <tbody>
          ${players
            .map(
              (player, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${player.name}</td>
              <td>${player.position || '-'}</td>
              <td>${formatCurrency(player.basePrice)}</td>
              <td class="price-cell">${formatCurrency(player.finalPrice)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="team-total">
        <span>Total Spent:</span>
        <span class="price-cell">${formatCurrency(
          players.reduce((sum, p) => sum + p.finalPrice, 0)
        )}</span>
      </div>
      `
          : '<p style="text-align: center; color: #666; padding: 20px;">No players assigned to this team</p>'
      }
    </div>
  `
    )
    .join('')}

  <!-- Summary -->
  <div class="summary-section">
    <div class="summary-title">Auction Summary</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${teams.length}</div>
        <div class="summary-label">Total Teams</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${totalSoldPlayers}</div>
        <div class="summary-label">Players Sold</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${totalUnsoldPlayers}</div>
        <div class="summary-label">Players Unsold</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${formatCurrency(totalAuctionAmount)}</div>
        <div class="summary-label">Total Auction Amount</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${formatCurrency(
          totalAuctionAmount / totalSoldPlayers || 0
        )}</div>
        <div class="summary-label">Average Price</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${auction.totalCreditsPerTeam * teams.length}</div>
        <div class="summary-label">Total Credits</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by Auction App - Real-Time Sports Player Auction</p>
    <p>Report ID: ${auction.id} | Owner: ${auction.ownerName}</p>
    <p>This report was automatically generated and contains accurate information at the time of generation.</p>
  </div>
</body>
</html>
    `;
  }

  private getAuctionTypeLabel(type: string): string {
    switch (type) {
      case 'playerBid':
        return 'Player Auction';
      case 'teamBid':
        return 'Team Auction';
      case 'numberWise':
        return 'Number-wise Auction';
      default:
        return type;
    }
  }

  // Generate and share auction summary
  async generateAndShare(auction: Auction): Promise<void> {
    try {
      const uri = await this.generateAuctionSummary(auction);
      const filename = `${auction.auctionName.replace(/[^a-zA-Z0-9]/g, '_')}_Summary`;
      await this.sharePDF(uri, filename);
    } catch (error) {
      console.error('Generate and share error:', error);
      throw error;
    }
  }
}

export default new PDFService();
