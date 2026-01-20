// Miro SDKの初期化を確認し、ボタンを有効化する関数
async function init() {
  const button = document.getElementById('export-btn');

  // MiroのUI（パネルやモーダル）として表示されたことをSDKに通知
  // これがないとMiro側で「アプリが反応していない」とみなされることがあります
  if (window.miro) {
    console.log("Miro SDK initialized");
  }

  button.addEventListener('click', async () => {
    try {
      // 1. 選択されているアイテムを取得
      const selectedItems = await miro.board.getSelection();
      
      console.log('Selected Items:', selectedItems); // デバッグ用

      if (!selectedItems || selectedItems.length === 0) {
        await miro.board.notifications.showError('ボード上の要素を選択してください');
        return;
      }

      // 2. テキストを持つ要素（マインドマップ、付箋、図形など）を抽出
      // item.content (図形や付箋) または item.nodeView.text (マインドマップ) をチェック
      const nodes = selectedItems.filter(item => 
        item.type === 'mindmap_node' || 
        item.type === 'shape' || 
        item.type === 'sticky_note' ||
        item.type === 'text'
      );

      if (nodes.length === 0) {
        await miro.board.notifications.showError('テキストを含む要素を選択してください');
        return;
      }

      // 3. 階層構造の解析
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const localRoots = nodes.filter(n => !n.parentId || !nodeMap.has(n.parentId));

      let csvRows = [];

      function traverse(node, currentPath) {
        // HTMLタグを除去し、テキストを取得
        let rawText = "";
        if (node.type === 'mindmap_node') {
          rawText = node.nodeView?.text || "";
        } else {
          rawText = node.content || "";
        }
        
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

      // 4. クリップボードへコピー
      const csvString = csvRows.join("\n");
      await navigator.clipboard.writeText(csvString);
      
      await miro.board.notifications.showInfo('CSVをコピーしました！');
      
    } catch (err) {
      console.error('Export Error:', err);
      // alertはiframe内でブロックされることがあるため通知を使う
      if (window.miro && miro.board.notifications) {
        await miro.board.notifications.showError('エラー: ' + err.message);
      }
    }
  });
}

// ページ読み込み完了時に実行
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
