import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ReadingHistoryScreen extends StatelessWidget {
  const ReadingHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E21),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0E21),
        elevation: 0,
        title: Text('Reading History', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold)),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 80, color: const Color(0xFF6B7280).withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text(
              'No history yet',
              style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Articles you read will appear here.',
              style: GoogleFonts.poppins(color: const Color(0xFF6B7280)),
            ),
          ],
        ),
      ),
    );
  }
}
