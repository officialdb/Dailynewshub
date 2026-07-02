import 'dart:io';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ArticleImage extends StatelessWidget {
  const ArticleImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.borderRadius = BorderRadius.zero,
    this.placeholderIcon = Icons.image_outlined,
    this.placeholderColor,
  });

  final String? imageUrl;
  final BoxFit fit;
  final BorderRadiusGeometry borderRadius;
  final IconData placeholderIcon;
  final Color? placeholderColor;

  bool _isNetworkImage(String value) {
    final uri = Uri.tryParse(value);
    return uri != null && (uri.scheme == 'http' || uri.scheme == 'https');
  }

  ImageProvider<Object>? _resolveProvider(String value) {
    if (_isNetworkImage(value)) {
      return NetworkImage(value);
    }

    final uri = Uri.tryParse(value);
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
    final value = imageUrl?.trim() ?? '';
    final provider = value.isEmpty ? null : _resolveProvider(value);
    final devicePixelRatio = MediaQuery.devicePixelRatioOf(context);

    final placeholder = Container(
      color:
          placeholderColor ??
          Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Icon(
        placeholderIcon,
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
      ),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final cacheWidth =
            constraints.hasBoundedWidth && constraints.maxWidth.isFinite
            ? (constraints.maxWidth * devicePixelRatio).round()
            : null;
        final cacheHeight =
            constraints.hasBoundedHeight && constraints.maxHeight.isFinite
            ? (constraints.maxHeight * devicePixelRatio).round()
            : null;

        return ClipRRect(
          borderRadius: borderRadius,
          child: provider != null
              ? provider is NetworkImage
                    ? CachedNetworkImage(
                        imageUrl: value,
                        fit: fit,
                        memCacheWidth: cacheWidth,
                        memCacheHeight: cacheHeight,
                        maxWidthDiskCache: cacheWidth,
                        maxHeightDiskCache: cacheHeight,
                        placeholder: (context, url) => placeholder,
                        errorWidget: (context, url, error) => placeholder,
                        fadeInDuration: const Duration(milliseconds: 150),
                      )
                    : Image(
                        image: ResizeImage.resizeIfNeeded(
                          cacheWidth,
                          cacheHeight,
                          provider,
                        ),
                        fit: fit,
                        gaplessPlayback: true,
                        errorBuilder: (context, error, stackTrace) =>
                            placeholder,
                      )
              : placeholder,
        );
      },
    );
  }
}
