import { FFmpegKit, FFprobeKit } from 'ffmpeg-kit-react-native';
import { Platform } from 'react-native';
export class VideoManager {
  static async getVideoInfo(path) {
    const command = `-i ${path} -v quiet -print_format json -show_format -show_streams`;
    const response = await FFprobeKit.execute(command);
    const output = await JSON.parse(await response.getOutput());
    const videoInfo = {
      duration: +output.format.duration,
      creationDate: output.format.tags.creation_time,
      size: +output.format.size,
      bit_rate: +output.format.bit_rate,
      width: +output.streams[1].width,
      height: +output.streams[1].height,
      frame_rate: output.streams[1].avg_frame_rate,
      codec_name: output.streams[1].codec_name,
      codec_type: output.streams[1].codec_type,
      sample_aspect_ratio: output.streams[1].sample_aspect_ratio,
    };
    return videoInfo;
  }
  static formatPath(path) {
    const secondDotIndex = path.lastIndexOf('.');
    const newPath = Platform.select({
      ios: path.split('.')[0],
      android: path.substring(0, secondDotIndex),
    });
    return newPath;
  }
  static async createThumbnail(path, fps = 1) {
    const newPath = this.formatPath(path);
    const command = `-i ${path} -vf fps=${fps} ${newPath}_thumb_%01d.jpg`;
    await FFmpegKit.execute(command);
    const thumnailPath = `${newPath}_thumb_1.jpg`;
    return thumnailPath;
  }
  static async trimVideo(path, startTime, duration) {
    const newPath = this.formatPath(path);
    const outputPath = `${newPath}_trim.mp4`;
    const command = `-y -i ${path} -ss ${startTime} -t ${duration} -c:v libx264 -preset ultrafast -pix_fmt yuv420p ${outputPath}`;
    await FFmpegKit.execute(command);
    return outputPath;
  }
  static async compressVideo(path, height) {
    const newPath = this.formatPath(path);
    const outputPath = `${newPath}_compress.mp4`;
    const command = `-y -i ${path} -vf "scale=-2:'min(${height},ih)'" -c:v libx264 -preset ultrafast -pix_fmt yuv420p ${outputPath}`;
    await FFmpegKit.execute(command);
    return outputPath;
  }
  static async createFrames(path, fps = 1) {
    const newPath = this.formatPath(path);
    const command = `-y -i ${path} -vf fps=${fps} -preset ultrafast ${newPath}_thumb_%01d.jpg`;
    await FFmpegKit.execute(command);
    return `${newPath}_thumb_`;
  }
  static async reverseVideo(path) {
    const newPath = this.formatPath(path);
    const outputPath = `${newPath}_reverse.mp4`;
    const command = `-i ${path} -vf reverse ${outputPath}`;
    await FFmpegKit.execute(command);
    return outputPath;
  }
  static async mergeVideos(
    paths,
    newVideoPath,
    height = '1920',
    width = '1080'
  ) {
    const inputStrings = paths.map((videoPath) => `-i ${videoPath}`).join(' ');
    const resizeString = paths
      .map(
        (_, index) =>
          `[${index}:v]scale=${height}:${width},setsar=1[v${index}]; `
      )
      .join(' ');
    const concatString = paths
      .map((_, index) => `[v${index}][${index}:a]`)
      .join('');
    await FFmpegKit.execute(`-y ${inputStrings}  -filter_complex \
      "${resizeString} \
      ${concatString}concat=n=${paths.length}:v=1:a=1[v][a]" -vsync 2 -map "[v]" -map "[a]" ${newVideoPath}`);
    return newVideoPath;
  }
  static async boomerang(path, reorder) {
    const newPath = this.formatPath(path);
    const reversedVideo = await this.reverseVideo(path);
    const outputPath = `${newPath}_boomerang.mp4`;
    const pathList = reorder ? [reversedVideo, path] : [path, reversedVideo];
    await this.mergeVideos(pathList, `${outputPath}`);
    return outputPath;
  }
  static async setSpeed(path, speed = 1) {
    const newPath = this.formatPath(path);
    const outputPath = `${newPath}_slow.mp4`;
    const command = `-i ${path} -filter:v "setpts=${
      1 / speed
    }*PTS" ${outputPath}`;
    await FFmpegKit.execute(command);
    return outputPath;
  }
}
export default VideoManager;
