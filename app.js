async function initApp() {
  // 1. Miro SDKが完全に準備できるまで待つ
  if (typeof miro === 'undefined') {
    console.error('Miro SDK is not loaded yet');
    return;
  }

  const button = document.getElementById('export-btn');

  button.addEventListener('click', async () => {
    try {
      // 2. 選択状態を取得
      const selectedItems = await miro.board.getSelection();
      
      console.log('取得されたアイテム:', selectedItems);

      if (!selectedItems || selectedItems.length === 0) {
        await miro.board.notifications.showError('ボード上の要素を選択してください');
        return;
      }

      // 3. マインドマップ以外の「図形」や「付箋」も対象に含めてみる
      const nodes = selectedItems.filter(item => 
        item.type === 'mindmap_node' || 
        item.type === 'shape' || 
        item.type === 'sticky_note'
      );

      if (nodes.length === 0) {
        await miro.board.notifications.showError('テキストを持つ要素（ノード）を選択してください');
        return;
      }

      // --- 階層構造解析ロジック ---
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const localRoots = nodes.filter(n => !n.parentId || !nodeMap.has(n.parentId));

      let csvRows = [];
      function traverse(node, currentPath) {
        // nodeView.text または content からテキストを取得
        const rawText = node.nodeView?.text || node.content || "";
        const cleanText = rawText.replace(/<[^>]*>?/gm, '').replace(/"/g, '""').trim();
        const newPath = [...currentPath, `"${cleanText}"`];
        
        const children = nodes.filter(child => child.parentId === node.id);
        if (children.length === 0) {
          csvRows.push(newPath.join(","));
        } else {
          children.forEach(child => traverse(child, newPath));
        }
      }

      localRoots.forEach(root => traverse(root, []));
      
      const csvString = csvRows.join("\n");
      await navigator.clipboard.writeText(csvString);
      await miro.board.notifications.showInfo('CSVをコピーしました！');
      
    } catch (err) {
      console.error('エラー詳細:', err);
      alert('エラーが発生しました。コンソールを確認してください。');
    }
  });
}

// ページ読み込み完了時に実行
window.addEventListener('load', initApp);
