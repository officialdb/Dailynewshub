import 'dart:io';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.imagePath,
    required this.size,
    this.borderWidth = 0,
    this.backgroundColor,
    this.placeholderIcon = Icons.person,
    this.placeholderIconSize,
  });

  final String? imagePath;
  final double size;
  final double borderWidth;
  final Color? backgroundColor;
  final IconData placeholderIcon;
  final double? placeholderIconSize;

  ImageProvider<Object>? _resolveImageProvider(String value) {
    final uri = Uri.tryParse(value);

    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      return CachedNetworkImageProvider(value);
    }

    if (uri != null && uri.scheme == 'file') {
      final file = File(uri.toFilePath());
      if (file.existsSync()) {
        return FileImage(file);
      }
      return null;
    }

    final file = File(value);
    if (file.existsSync()) {
      return FileImage(file);
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final provider = imagePath == null
        ? null
        : _resolveImageProvider(imagePath!.trim());
    final cacheSize = (size * MediaQuery.devicePixelRatioOf(context)).round();
    final resizedProvider = provider == null
        ? null
        : ResizeImage.resizeIfNeeded(cacheSize, cacheSize, provider);

    Widget placeholder() {
      return Icon(
        placeholderIcon,
        size: placeholderIconSize ?? size * 0.45,
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color:
            backgroundColor ??
            Theme.of(context).colorScheme.surfaceContainerHighest,
        border: borderWidth > 0
            ? Border.all(
                color: Theme.of(context).colorScheme.primary,
                width: borderWidth,
              )
            : null,
      ),
      child: ClipOval(
        child: resizedProvider != null
            ? Image(
                image: resizedProvider,
                width: size,
                height: size,
                fit: BoxFit.cover,
                gaplessPlayback: true,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) {
                    return child;
                  }
                  return placeholder();
                },
                errorBuilder: (context, error, stackTrace) => placeholder(),
              )
            : placeholder(),
      ),
    );
  }
}
