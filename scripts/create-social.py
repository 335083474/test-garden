"""Render original brand typography and simple vector-like shapes for social previews."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent.parent
im=Image.new('RGB',(1200,630),'#f8f7ef');d=ImageDraw.Draw(im)
d.ellipse((850,30,1430,610),fill='#e5ecb2')
serif=Path('C:/Windows/Fonts/georgia.ttf')
sans=Path('C:/Windows/Fonts/arial.ttf')
def f(path,size):return ImageFont.truetype(str(path),size)
d.text((80,65),'Test Garden.',font=f(serif,38),fill='#193e31')
d.text((75,205),'A little curious?',font=f(serif,78),fill='#193e31')
d.text((75,305),'Start with yourself.',font=f(serif,78),fill='#6e8266')
d.text((83,485),'Free quizzes. Full results. No sign-up.',font=f(sans,26),fill='#646e61')
im.save(root/'src/social.png',optimize=True)
zh=Image.new('RGB',(1200,630),'#f8f7ef');d=ImageDraw.Draw(zh)
d.ellipse((850,30,1430,610),fill='#e5ecb2')
cjk=Path('C:/Windows/Fonts/msyh.ttc')
d.text((80,65),'测试花园',font=f(cjk,38),fill='#193e31')
d.text((75,205),'有点好奇？',font=f(cjk,78),fill='#193e31')
d.text((75,315),'从认识自己开始。',font=f(cjk,78),fill='#6e8266')
d.text((83,485),'免费测试 · 完整基础结果 · 无需注册',font=f(cjk,28),fill='#646e61')
zh.save(root/'src/social-zh.png',optimize=True)
print('Created 1200x630 social preview.')
