import * as fs from 'fs';
import * as path from 'path';

export class ViewEngine {
    private readonly viewsPath = path.join(__dirname, '../src/views');

    public async render(): Promise<string> {
        const indexPath = path.join(this.viewsPath, 'index.html');
        let html = await fs.promises.readFile(indexPath, 'utf-8');

        html = await this.replaceTemplates(html);

        return html;
    }

    private async replaceTemplates(html: string): Promise<string> {
        const templateRegex = /<!--\s*{{(.*?)}}\s*-->/g;
        let match;

        while ((match = templateRegex.exec(html)) !== null) {
            const [template, fileName] = match;
            const filePath = path.join(this.viewsPath, fileName);

            try {
                const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                const extension = path.extname(fileName);

                let replacement;
                if (extension === '.js') {
                    replacement = `<script>${fileContent}</script>`;
                } else if (extension === '.css') {
                    replacement = `<style>${fileContent}</style>`;
                } else {
                    replacement = fileContent;
                }

                html = html.replace(template, replacement);
            } catch (error) {
                console.error(`Error reading file: ${filePath}`, error);
            }
        }

        return html;
    }
}
