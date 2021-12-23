export default function replaceArrayContent(target: any[], newContent: any[]) {
  target.splice(0, target.length, ...newContent);
}
