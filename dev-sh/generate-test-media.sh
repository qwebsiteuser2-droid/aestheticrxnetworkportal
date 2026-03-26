#!/bin/bash
# Script to generate proper test videos with audio and animations
# Run this on the host system (not in Docker) if ffmpeg and ImageMagick are installed

set -e

echo "🎬 Generating proper test media files..."
echo ""

# Check for required tools
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found. Install with: sudo apt-get install ffmpeg"
    echo "   Videos will not be generated."
    FFMPEG_AVAILABLE=false
else
    FFMPEG_AVAILABLE=true
    echo "✅ ffmpeg found"
fi

if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Install with: sudo apt-get install imagemagick"
    echo "   Images and animations will not be generated."
    IMAGEMAGICK_AVAILABLE=false
else
    IMAGEMAGICK_AVAILABLE=true
    echo "✅ ImageMagick found"
fi

echo ""

# Create directories
MEDIA_DIR="backend/uploads/test-media"
mkdir -p "$MEDIA_DIR/videos"
mkdir -p "$MEDIA_DIR/images"
mkdir -p "$MEDIA_DIR/animations"

# Generate videos with audio
if [ "$FFMPEG_AVAILABLE" = true ]; then
    echo "📹 Generating videos with audio..."
    
    for duration in 5 10 15 20; do
        color="0066cc"
        case $duration in
            5) color="0066cc" ;;
            10) color="28a745" ;;
            15) color="dc3545" ;;
            20) color="ffc107" ;;
        esac
        
        # Generate audio tone
        audio_file="$MEDIA_DIR/temp_audio_${duration}s.wav"
        ffmpeg -f lavfi -i "sine=frequency=440:duration=${duration}" -y "$audio_file" 2>/dev/null
        
        # Generate video with text and audio
        output_file="$MEDIA_DIR/videos/test-video-${duration}s.mp4"
        ffmpeg -f lavfi -i "color=c=${color}:size=800x400:duration=${duration}" \
            -vf "drawtext=text='Test Video ${duration}s':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
            -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p \
            -i "$audio_file" -c:a aac -b:a 128k -shortest -y "$output_file" 2>/dev/null
        
        rm -f "$audio_file"
        echo "  ✅ Created: test-video-${duration}s.mp4"
    done
    echo ""
fi

# Generate animations
if [ "$IMAGEMAGICK_AVAILABLE" = true ]; then
    echo "🎞️  Generating animations..."
    
    temp_dir="$MEDIA_DIR/temp"
    mkdir -p "$temp_dir"
    
    for frames in 8 10 12 15; do
        frame_files=()
        colors=("0066cc" "28a745" "dc3545" "ffc107" "17a2b8" "6f42c1" "e83e8c" "fd7e14" "20c997" "343a40")
        
        # Generate frames
        for i in $(seq 0 $((frames-1))); do
            frame_file="$temp_dir/frame_$(printf "%03d" $i).png"
            color_index=$((i % ${#colors[@]}))
            color="${colors[$color_index]}"
            hue=$((i * 360 / frames))
            
            convert -size 800x400 xc:"hsl($hue,70%,50%)" \
                -pointsize 48 -fill white -gravity center \
                -annotate +0+0 "Slide $((i+1))" "$frame_file" 2>/dev/null
            
            frame_files+=("$frame_file")
        done
        
        # Combine into GIF
        output_file="$MEDIA_DIR/animations/test-animation-${frames}frames.gif"
        convert -delay 10 -loop 0 "${frame_files[@]}" "$output_file" 2>/dev/null
        
        # Cleanup
        rm -f "${frame_files[@]}"
        echo "  ✅ Created: test-animation-${frames}frames.gif"
    done
    
    rm -rf "$temp_dir"
    echo ""
fi

# Generate images
if [ "$IMAGEMAGICK_AVAILABLE" = true ]; then
    echo "🖼️  Generating images..."
    
    colors=("0066cc" "28a745" "dc3545" "ffc107" "17a2b8" "6f42c1" "e83e8c" "fd7e14")
    texts=("Banner Ad 1" "Banner Ad 2" "Banner Ad 3" "Banner Ad 4" "Banner Ad 5" "Banner Ad 6" "Banner Ad 7" "Banner Ad 8")
    
    for i in {0..7}; do
        output_file="$MEDIA_DIR/images/test-image-$((i+1)).png"
        convert -size 800x400 xc:"#${colors[$i]}" \
            -pointsize 48 -fill white -gravity center \
            -annotate +0+0 "${texts[$i]}" "$output_file" 2>/dev/null
        echo "  ✅ Created: test-image-$((i+1)).png"
    done
    echo ""
    
    echo "📸 Generating slides set (10 images)..."
    slide_colors=("0066cc" "28a745" "dc3545" "ffc107" "17a2b8" "6f42c1" "e83e8c" "fd7e14" "20c997" "343a40")
    
    for i in {0..9}; do
        output_file="$MEDIA_DIR/images/slide-$((i+1)).png"
        convert -size 800x400 xc:"#${slide_colors[$i]}" \
            -pointsize 48 -fill white -gravity center \
            -annotate +0+0 "Slide $((i+1))" "$output_file" 2>/dev/null
        echo "  ✅ Created: slide-$((i+1)).png"
    done
    echo ""
fi

echo "✅ Test media generation complete!"
echo ""
echo "📁 Location: $MEDIA_DIR"
echo ""
echo "📊 Summary:"
if [ "$FFMPEG_AVAILABLE" = true ]; then
    echo "  Videos (with audio): $(ls -1 "$MEDIA_DIR/videos"/*.mp4 2>/dev/null | wc -l)"
fi
if [ "$IMAGEMAGICK_AVAILABLE" = true ]; then
    echo "  Animations: $(ls -1 "$MEDIA_DIR/animations"/*.gif 2>/dev/null | wc -l)"
    echo "  Images: $(ls -1 "$MEDIA_DIR/images"/*.png 2>/dev/null | wc -l)"
fi

