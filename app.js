// Miro SDKの初期化
async function init() {
  await miro.board.ui.on('icon:click', async () => {
    const selectedItems = await miro.board.getSelection();
    // マインドマップのノードだけを抽出
    const nodes = selectedItems.filter(item => item.type === 'mindmap_node');

    if (nodes.length === 0) {
      await miro.board.notifications.showError('マインドマップのノードを選択してください');
      return;
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    // 選択範囲内で「親が選択されていない」ものをルートとする
    const localRoots = nodes.filter(n => !n.parentId || !nodeMap.has(n.parentId));

    let csvRows = [];

    function traverse(node, currentPath) {
      // HTMLタグ除去とカンマのエスケープ
      const cleanText = node.nodeView.text.replace(/<[^>]*>?/gm, '').replace(/"/g, '""');
      const newPath = [...currentPath, `"${cleanText}"`];
      
      const children = nodes.filter(child => child.parentId === node.id);

      if (children.length === 0) {
        csvRows.push(newPath.join(","));
      } else {
        children.forEach(child => traverse(child, newPath));
      }
    }

    localRoots.forEach(root => traverse(root, []));

    // クリップボードにコピー
    const csvString = csvRows.join("\n");
    await navigator.clipboard.writeText(csvString);
    await miro.board.notifications.showInfo('CSVをクリップボードにコピーしました！');
  });
}

init();
