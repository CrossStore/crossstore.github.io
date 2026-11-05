import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
// Same 256-unit canvas and 24-unit Bold strokes as the firmware's Phosphor family.
const shapes = {
  book_store: '<path d="M40 112v104h176V112M28 96l16-56h168l16 56v16a25 25 0 0 1-50 0 25 25 0 0 1-50 0 25 25 0 0 1-50 0 25 25 0 0 1-50 0V96Z"/><path d="M28 96h200M92 160h28l8 8 8-8h28v40h-28l-8 8-8-8H92Z" stroke-width="16"/>',
  weread: '<path d="M128 92c-28-19-60-25-96-16v132c36-9 68-3 96 16 28-19 60-25 96-16v-88M128 92v132"/><path d="M160 28h56a16 16 0 0 1 16 16v32a16 16 0 0 1-16 16h-24l-32 24V92a16 16 0 0 1-16-16V44a16 16 0 0 1 16-16Z"/>',
  game2048: '<rect x="28" y="28" width="80" height="80" rx="12"/><rect x="148" y="28" width="80" height="80" rx="12"/><rect x="28" y="148" width="80" height="80" rx="12"/><rect x="148" y="148" width="80" height="80" rx="12"/><path d="M52 56c0-16 32-16 32 0 0 12-32 16-32 28h32M172 52v20h32m-8-20v36" stroke-width="12"/>',
  gomoku: '<path d="M32 64h192M32 128h192M32 192h192M64 32v192M128 32v192M192 32v192" stroke-width="16"/><circle cx="64" cy="64" r="28" fill="currentColor" stroke="none"/><circle cx="192" cy="192" r="28" fill="white" stroke-width="16"/>',
  calculator: '<rect x="56" y="24" width="144" height="208" rx="16"/><path d="M88 64h80M88 112h8M160 112h8M88 152h8M160 152h8M88 192h8M160 192h8"/>',
  sudoku: '<rect x="28" y="28" width="200" height="200" rx="12"/><path d="M96 28v200M160 28v200M28 96h200M28 160h200" stroke-width="16"/><path d="M57 56h12M120 120h16M185 184h14"/>',
  chinese_chess: '<circle cx="128" cy="128" r="100"/><path d="M80 72h88v64M104 100v36h84l-8 52h-24M76 164h72" stroke-width="16"/>',
  minesweeper: '<rect x="28" y="28" width="200" height="200" rx="12"/><path d="M28 160h200M96 160v68M160 160v68M108 136V60l60 24-60 24"/><path d="M88 136h40" stroke-width="16"/>',
  gallery: '<path d="M36 168H24V32h168v16"/><rect x="64" y="72" width="168" height="152" rx="12"/><path d="m64 188 48-48 40 40 24-24 56 56"/><circle cx="184" cy="116" r="12" fill="currentColor" stroke="none"/>',
  rf_chat: '<path d="M80 100H40v112l40-24h112v-40M112 188v36M80 224h64M116 100a40 40 0 0 1 40 40M116 52a88 88 0 0 1 88 88"/><circle cx="112" cy="144" r="12" fill="currentColor" stroke="none"/>',
  wifi_chat: '<path d="M40 104v100l40-24h136v-76M48 56a128 128 0 0 1 160 0M80 92a76 76 0 0 1 96 0M112 128a24 24 0 0 1 32 0"/>',
  esp_chat: '<path d="M28 36h136v100H68l-40 28V36ZM100 188h88l40 28V112h-32"/><circle cx="96" cy="84" r="10" fill="currentColor" stroke="none"/>',
  woodfish: '<path d="M48 128c-24 0-32 32-24 56 8 24 48 40 104 40s96-16 104-40c8-24 0-56-24-56-16-48-48-64-80-64-24 0-48 12-64 32M84 144c24 16 64 16 88 0M120 112l64-64"/><ellipse cx="192" cy="40" rx="24" ry="16" transform="rotate(-32 192 40)"/>',
  library: '<rect x="28" y="40" width="48" height="176" rx="6"/><rect x="76" y="40" width="48" height="176" rx="6"/><path d="m144 52 44-12 44 164-44 12-44-164ZM28 84h96M28 180h96"/>',
  standby: '<rect x="24" y="32" width="208" height="152" rx="12"/><path d="M88 224h80M128 184v40M160 64a44 44 0 1 0 32 64 48 48 0 0 1-32-64Z"/>',
  appstore: '<path d="M40 72h176l12 152H28L40 72ZM88 72V56a40 40 0 0 1 80 0v16"/><path d="M96 120h8M152 120h8M96 168h8M152 168h8"/>',
};
export async function buildAppIcons() {
  await mkdir('public/assets/app-icons', {recursive:true});
  await copyFile('assets/icon-sources/LICENSE-Phosphor.txt','public/assets/app-icons/LICENSE-Phosphor.txt');
  await copyFile('LICENSE','public/assets/app-icons/LICENSE-CrossStore.txt');
  const manifest=[];
  for(const [id,shape] of Object.entries(shapes)) {
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>\n`;
    await writeFile(`public/assets/app-icons/${id}.svg`,svg);
    manifest.push({id,source:'CrossStore semantic drawing',grid:256,stroke:24});
  }
  for(const [id,source] of [['airtune','radio'],['camera','camera'],['reading_stats','calendar-blank']]) {
    await copyFile(`assets/icon-sources/${source}-bold.svg`,`public/assets/app-icons/${id}.svg`);
    manifest.push({id,source:`Phosphor ${source} Bold`,grid:256,stroke:24});
  }
  await writeFile('public/assets/app-icons/manifest.json',JSON.stringify({style:'Phosphor-compatible Bold',license:'MIT',icons:manifest},null,2)+'\n');
}
await buildAppIcons();
