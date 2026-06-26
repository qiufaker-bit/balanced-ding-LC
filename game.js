const { createBalanceDingGame } = require('./src/balance-ding-game.js');

const canvas = wx.createCanvas();

wx.showShareMenu && wx.showShareMenu({ withShareTicket: true });

const game = createBalanceDingGame({
  canvas,
  platform: 'wechat',
  wx,
  characterSrc: 'assets/rv-rider-character.png',
  bombSrc: 'assets/bacteria-bomb.png'
});

if (wx.onShareAppMessage) {
  wx.onShareAppMessage(() => ({
    title: game.getShareTitle(),
    imageUrl: ''
  }));
}

game.start();
