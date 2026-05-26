const vscode = require('vscode');

function activate(context) {
    const historyKey = "searchHistory";

    class HistoryProvider {
        constructor(context) {
            this.context = context;
            this._onDidChangeTreeData = new vscode.EventEmitter();
            this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        }

        refresh() {
            this._onDidChangeTreeData.fire();
        }

        getTreeItem(element) {
            return element;
        }

        getChildren() {
            const history = this.context.globalState.get(historyKey) || [];

            return history.map(item => {
                const treeItem = new vscode.TreeItem(item);
                treeItem.command = {
                    command: "extension.runSearchFromHistory",
                    title: "Run Search",
                    arguments: [item]
                };
                return treeItem;
            });
        }
    }

    const provider = new HistoryProvider(context);

    vscode.window.createTreeView('searchHistoryView', {
        treeDataProvider: provider
    });

    // ✅ Main search command (Ctrl+Shift+F)
    const searchCmd = vscode.commands.registerCommand(
        "extension.searchWithHistory",
        async () => {
            let query;

            const editor = vscode.window.activeTextEditor;

            // ✅ Use selected text if exists
            if (editor) {
                const selection = editor.document.getText(editor.selection);
                if (selection && selection.trim().length > 0) {
                    query = selection.trim();
                }
            }

            // ✅ Otherwise ask user
            if (!query) {
                query = await vscode.window.showInputBox({
                    prompt: "Search in files"
                });
            }

            if (!query) return;

            query = query.trim();

            let history = context.globalState.get(historyKey) || [];
            history = [query, ...history.filter(h => h !== query)].slice(0, 50);

            await context.globalState.update(historyKey, history);

            provider.refresh();

            vscode.commands.executeCommand(
                "workbench.action.findInFiles",
                { query }
            );
        }
    );

    // ✅ Click item → run search
    const runFromHistory = vscode.commands.registerCommand(
        "extension.runSearchFromHistory",
        (query) => {
            vscode.commands.executeCommand(
                "workbench.action.findInFiles",
                { query }
            );
        }
    );

    // ✅ Delete single item
    const deleteCmd = vscode.commands.registerCommand(
        "extension.deleteHistoryItem",
        async (item) => {
            let history = context.globalState.get(historyKey) || [];

            history = history.filter(h => h !== item.label);

            await context.globalState.update(historyKey, history);

            provider.refresh();
        }
    );

    // ✅ Clear all history
    const clearCmd = vscode.commands.registerCommand(
        "extension.clearHistory",
        async () => {
            const confirm = await vscode.window.showWarningMessage(
                "Clear entire search history?",
                "Yes",
                "No"
            );

            if (confirm !== "Yes") return;

            await context.globalState.update(historyKey, []);

            provider.refresh();
        }
    );

    context.subscriptions.push(
        searchCmd,
        runFromHistory,
        deleteCmd,
        clearCmd
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
