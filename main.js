/* jshint curly:true, debug:true */
/* globals $, firebase */

/**
 * -------------------
 * 書籍一覧画面関連の関数
 * -------------------
 */

// 画像をダウンロードする
const downloadPhotoImage = photoImageLocation => firebase
  .storage()
  .ref(photoImageLocation)
  .getDownloadURL() // photo-images/abcdef のようなパスから画像のダウンロードURLを取得
  .catch((error) => {
    console.error('写真のダウンロードに失敗:', error);
  });

// 画像を表示する
const displayPhotoImage = ($divTag, url) => {
  $divTag.find('.photo-item__image').attr({
    src: url,
  });
};

// Realtime Database の photos から写真を削除する
const deletePhoto = (photoId) => {
  // TODO: photos から該当の書籍データを削除
  
  firebase
    .database()
    .ref(`photos/${photoId}`) 
    .remove();
};

// 写真の表示用のdiv（jQueryオブジェクト）を作って返す
const createPhotoDiv = (photoId, photoData) => {
  // HTML内のテンプレートからコピーを作成する
  const $divTag = $('#photo-template > .photo-item').clone();
  
  // 写真の登録日を表示する
  $divTag.find('.photo-item__date').text(photoData.photoDate);
  // 写真タイトルを表示する
  $divTag.find('.photo-item__title').text(photoData.photoTitle);
  // 写真コメントを表示する
  $divTag.find('.photo-item__comment').text(photoData.photoComment);

  // 写真の画像をダウンロードして表示する
  downloadPhotoImage(photoData.photoImageLocation).then((url) => {
    displayPhotoImage($divTag, url);
  });

  // id属性をセット
  $divTag.attr('id', `photo-id-${photoId}`);

  // 削除ボタンのイベントハンドラを登録
  const $deleteButton = $divTag.find('.photo-item__delete');
  $deleteButton.on('click', () => {
    deletePhoto(photoId);
  });

  return $divTag;
};

// 写真一覧画面内の写真データをクリア
const resetAlbumView = () => {
  $('#photo-list').empty();
};

// 書籍一覧画面に書籍データを表示する
const addPhoto = (photoId, photoData) => {
  const $divTag = createPhotoDiv(photoId, photoData);
  $divTag.appendTo('#photo-list');
};

// 写真一覧画面の初期化、イベントハンドラ登録処理
const loadAlbumView = () => {
  resetAlbumView();

  // 写真データを取得
  const photosRef = firebase
    .database()
    .ref('photos')
    .orderByChild('createdAt');

  // 過去に登録したイベントハンドラを削除
  photosRef.off('child_removed');
  photosRef.off('child_added');

  // photos の child_removedイベントハンドラを登録
  // （データベースから書籍が削除されたときの処理）
  photosRef.on('child_removed', (photoSnapshot) => {
    const photoId = photoSnapshot.key;
    const $photo = $(`#photo-id-${photoId}`);

    // 写真一覧画面から該当の書籍データを削除する
    $photo.remove();
  });

  // photos の child_addedイベントハンドラを登録
  // （データベースに写真が追加保存されたときの処理）
  photosRef.on('child_added', (photoSnapshot) => {
    const photoId = photoSnapshot.key;
    const photoData = photoSnapshot.val();

    // 写真一覧画面に写真データを表示する
    addPhoto(photoId, photoData);
  });
};

/**
 * ----------------------
 * すべての画面共通で使う関数
 * ----------------------
 */

// ビュー（画面）を変更する
const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'album') {
    loadAlbumView();
  }
};

/**
 * -------------------------
 * ログイン・ログアウト関連の関数
 * -------------------------
 */

// ログインフォームを初期状態に戻す
const resetLoginForm = () => {
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

// ログインした直後に呼ばれる
const onLogin = () => {
  console.log('ログイン完了');

  // Z一覧画面を表示
  showView('album');
};

// ログアウトした直後に呼ばれる
const onLogout = () => {
  const photosRef = firebase.database().ref('photos');

  // 過去に登録したイベントハンドラを削除
  photosRef.off('child_removed');
  photosRef.off('child_added');

  showView('login');
};

/**
 * ------------------
 * イベントハンドラの登録
 * ------------------
 */

// ログイン状態の変化を監視する
firebase.auth().onAuthStateChanged((user) => {
  // ログイン状態が変化した
  if (user) {
    // ログイン済
    onLogin();
  } else {
    // 未ログイン
    onLogout();
  }
});

// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();

  const $loginButton = $('#login__submit-button');
  $loginButton.text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みる
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // ログインに成功したときの処理
      console.log('ログインしました。');

      // ログインフォームを初期状態に戻す
      resetLoginForm();
    })
    .catch((error) => {
      // ログインに失敗したときの処理
      console.error('ロ��インエラー', error);

      $('#login__help')
        .text('ログインに失敗しました。')
        .show();

      // ログインボタンを元に戻す
      $loginButton.text('ログイン');
    });
});

// ログアウトボタンが押されたらログアウトする
$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});

/**
 * -------------------------
 * 写真情報追加モーダル関連の処理
 * -------------------------
 */

// 写真の登録モーダルを初期状態に戻す
const resetAddPhotoModal = () => {
  $('#photo-form')[0].reset();
  $('#add-photo-image-label').text('');
  $('#submit_add_photo')
    .prop('disabled', false)
    .text('保存する');
};

// 選択した画像の、ファイル名を表示する
$('#add-photo-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#add-photo-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('ファイルを選択');
  }
});

// 写真の登録処理
$('#photo-form').on('submit', (e) => {
  e.preventDefault();

  // 写真の登録ボタンを押せないようにする
  $('#submit_add_photo')
    .prop('disabled', true)
    .text('送信中…');
  // 写真の登録日
  const photoDate = $('#add-photo-date').val();
  // 写真タイトル
  const photoTitle = $('#add-photo-title').val();
  // 写真へのコメント
  const photoComment = $('#add-photo-comment').val();
  // let comment = 'メンターテスト';

  const $photoImage = $('#add-photo-image');
  const { files } = $photoImage[0];

  if (files.length === 0) {
    // ファイルが選択されていないなら何もしない
    return;
  }

  const file = files[0]; // 画像ファイル
  const filename = file.name; // 画像ファイル名
  const photoImageLocation = `photo-images/${filename}`; // 画像ファイルのアップロード先

  // 書籍データを保存する
  firebase
    .storage()
    .ref(photoImageLocation)
    .put(file) // Storageへファイルアップロードを実行
    .then(() => {
      // Storageへのアップロードに成功したら、Realtime Databaseに書籍データを保存する
      const photoData = {
        photoDate,
        photoTitle,
        photoImageLocation,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        photoComment,
      };
      return firebase
        .database()
        .ref('photos')
        .push(photoData);
    })
    .then(() => {
      // 書籍一覧画面の書籍の登録モーダルを閉じて、初期状態に戻す
      $('#add-photo-modal').modal('hide');
      resetAddPhotoModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetAddPhotoModal();
      $('#add-photo__help')
        .text('保存できませんでした。')
        .fadeIn();
    });
});

/**
 * ----------------------------
 * back-to-topに関するjs
 * ----------------------------
 */
// ボタンの表示/非表示を切り替える関数
const updateButton = () => {
  if ($(window). scrollTop() >= 300) {
    // 300px以上スクロールされた
    // ボタンを表示
    $('.back-to-top').fadeIn();
  } else {
    // ボタンを非表示
    $('.back-to-top').fadeOut();
  }
};

// スクロールされる度にupdateButtonを実行
$(window).on('scroll', updateButton);

// ボタンをクリックしたらページトッップにスクロールする
$('.back-to-top').on('click', (e) => {
  // 戊団のhrefに遷移しない
  e.preventDefault();
  
  // 600msかけてトップに戻る
  const contentsTop = $('#photo-template').offset().top;
  $('html, body').animate({ scrollTop: contentsTop }, 600);
});

// ページの途中でリロードされた場合でも、ボタンが表示されるようにする
updateButton();