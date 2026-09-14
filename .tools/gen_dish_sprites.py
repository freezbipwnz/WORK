# -*- coding: utf-8 -*-
# Генератор пиксель-арт спрайтов блюд RestoCity (cozy chibi, тёплые цвета, тёмный контур).
# Рисуем в 4x и даунскейлим LANCZOS'ом до 96x96 — гладкие края на прозрачном фоне.
import math
from PIL import Image, ImageDraw

S = 4      # суперсемплинг
SZ = 96    # итоговый размер
OUT = 'public/sprites'

def canvas():
    return Image.new('RGBA', (SZ * S, SZ * S), (0, 0, 0, 0))

def E(v):
    return v * S

def ell(d, cx, cy, rx, ry, fill, outline=None, ow=2):
    d.ellipse([E(cx - rx), E(cy - ry), E(cx + rx), E(cy + ry)],
              fill=fill, outline=outline, width=int(E(ow)) if outline else 1)

def rot_ellipse(img, cx, cy, rx, ry, angle, fill, outline=None, ow=2):
    """Повёрнутый эллипс: рисуем на слое, вращаем, клеим."""
    pad = 6
    w = int(E(2 * rx + 2 * pad)); h = int(E(2 * ry + 2 * pad))
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([E(pad), E(pad), E(pad + 2 * rx), E(pad + 2 * ry)],
               fill=fill, outline=outline, width=int(E(ow)) if outline else 1)
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(layer, (int(E(cx) - layer.width / 2), int(E(cy) - layer.height / 2)))

def line(d, x1, y1, x2, y2, fill, w=2):
    d.line([E(x1), E(y1), E(x2), E(y2)], fill=fill, width=int(E(w)))

def poly(d, pts, fill, outline=None, ow=2):
    d.polygon([(E(x), E(y)) for x, y in pts], fill=fill,
              outline=outline, width=int(E(ow)) if outline else 1)

def save(img, name):
    img = img.resize((SZ, SZ), Image.LANCZOS)
    img.save(f'{OUT}/{name}.png')
    print(name, 'ok')

# ============ ПИЦЦА ============
def pizza():
    img = canvas()
    d = ImageDraw.Draw(img)
    # мягкая тень
    ell(d, 48, 76, 34, 8, (0, 0, 0, 55))
    # корка-бортик
    ell(d, 48, 50, 41, 33, (214, 148, 60, 255), outline=(107, 58, 26, 255), ow=3)
    ell(d, 48, 47, 40, 32, (232, 168, 76, 255))
    # подпечённые пятнышки на корке
    for x, y, r in [(22, 38, 3), (74, 40, 3), (30, 66, 2.6), (66, 64, 2.6), (48, 21, 2.6)]:
        ell(d, x, y, r, r * 0.8, (196, 122, 44, 255))
    # сыр
    ell(d, 48, 49, 32, 25, (200, 130, 40, 255))
    ell(d, 48, 48, 31, 24, (247, 209, 84, 255))
    ell(d, 46, 45, 27, 20, (252, 222, 112, 255))
    # томатные акценты
    for x, y, r in [(30, 40, 4), (64, 37, 4), (53, 63, 4), (36, 59, 3.4), (67, 55, 3.4)]:
        ell(d, x, y, r, r * 0.85, (222, 90, 46, 255))
    # пепперони
    for x, y in [(36, 42), (60, 40), (48, 57), (29, 54), (63, 55)]:
        ell(d, x, y, 6.5, 5.6, (192, 57, 43, 255), outline=(120, 30, 20, 255), ow=1.6)
        ell(d, x - 1.6, y - 1.6, 2.4, 1.9, (232, 112, 82, 255))
        ell(d, x + 2, y + 1.2, 1.2, 1, (150, 35, 25, 255))
    # базилик
    for x, y, a in [(48, 34, -25), (41, 49, 30), (57, 48, -60)]:
        rot_ellipse(img, x, y, 5, 2.7, a, (92, 162, 72, 255), outline=(50, 100, 40, 255), ow=1.2)
    # блик на корке
    d = ImageDraw.Draw(img)
    ell(d, 31, 30, 7, 3.5, (255, 224, 150, 170))
    return img

# ============ СТЕЙК ============
def steak():
    img = canvas()
    d = ImageDraw.Draw(img)
    # тень
    ell(d, 48, 79, 36, 7, (0, 0, 0, 55))
    # тарелка
    ell(d, 48, 57, 43, 21, (245, 240, 230, 255), outline=(120, 100, 85, 255), ow=2.5)
    ell(d, 48, 56, 33, 15, (228, 222, 208, 255))
    ell(d, 48, 55, 32, 14, (245, 240, 230, 255))
    # стейк (повёрнутый овал)
    rot_ellipse(img, 48, 49, 26, 14, -12, (94, 42, 24, 255))
    rot_ellipse(img, 48, 49, 24.5, 13, -12, (165, 74, 46, 255))
    rot_ellipse(img, 47, 47.5, 21.5, 10.5, -12, (198, 108, 64, 255))
    # решётка гриля: штрихи вдоль главной оси, обрезанные по эллипсу
    d = ImageDraw.Draw(img)
    cx, cy, rx, ry, ang = 47, 47.5, 20, 9.8, math.radians(-12)
    ca, sa = math.cos(ang), math.sin(ang)
    for i in range(-2, 3):
        t = i * 4.2
        L = rx * math.sqrt(max(0.0, 1 - (t / ry) ** 2)) * 0.9
        mx, my = cx - sa * t, cy + ca * t
        line(d, mx - ca * L, my - sa * L, mx + ca * L, my + sa * L, (122, 52, 30, 255), w=2)
    # блик
    rot_ellipse(img, 38, 42, 7, 3, -12, (255, 235, 220, 110))
    # помидорки черри на тарелке
    d = ImageDraw.Draw(img)
    for x, y in [(72, 52), (66, 60)]:
        ell(d, x, y, 3.4, 3.1, (214, 66, 50, 255), outline=(140, 35, 25, 255), ow=1.2)
        ell(d, x - 1, y - 1, 1.1, 0.9, (250, 150, 130, 255))
    # петрушка
    for x, y, r in [(24, 57, 2.4), (27, 59, 2.4), (22, 60, 2.2), (26, 55, 2)]:
        ell(d, x, y, r, r, (110, 175, 80, 255), outline=(60, 115, 45, 255), ow=1)
    # капли соуса
    for x, y in [(78, 62), (81, 58)]:
        ell(d, x, y, 1.4, 1.2, (160, 60, 30, 255))
    return img

# ============ СУШИ (нигири на доске) ============
def sushi():
    img = canvas()
    d = ImageDraw.Draw(img)
    # тень
    ell(d, 48, 76, 32, 6, (0, 0, 0, 55))
    # деревянная доска
    d.rounded_rectangle([E(14), E(60), E(82), E(72)], radius=E(5),
                        fill=(210, 170, 120, 255), outline=(140, 100, 60, 255), width=int(E(2)))
    d.rounded_rectangle([E(17), E(62), E(79), E(66)], radius=E(3), fill=(228, 190, 140, 255))

    def nigiri(cx, cy, top_fill, top_out, stripe):
        rot_ellipse(img, cx, cy + 3, 13, 8.5, 0, (250, 248, 242, 255), outline=(185, 172, 155, 255), ow=1.8)
        rot_ellipse(img, cx, cy - 1, 13.6, 7.2, 0, top_fill, outline=top_out, ow=1.8)
        # полоски на рыбе
        dd = ImageDraw.Draw(img)
        for dx in (-6, 0, 6):
            line(dd, cx + dx - 3, cy - 6, cx + dx + 3, cy + 2, stripe, w=1.6)

    nigiri(34, 46, (240, 130, 100, 255), (198, 88, 60, 255), (255, 205, 185, 255))  # лосось
    nigiri(62, 48, (205, 70, 70, 255), (140, 40, 40, 255), (240, 140, 130, 255))    # тунец
    # васаби и имбирь
    d = ImageDraw.Draw(img)
    ell(d, 22, 66, 3.2, 2.8, (130, 190, 90, 255), outline=(80, 130, 55, 255), ow=1.2)
    ell(d, 74, 67, 3.4, 2.6, (245, 180, 190, 255), outline=(200, 120, 135, 255), ow=1.2)
    return img

# ============ БУРГЕР ============
def burger():
    img = canvas()
    d = ImageDraw.Draw(img)
    # тень
    ell(d, 48, 76, 28, 6, (0, 0, 0, 55))
    # нижняя булка
    ell(d, 48, 66, 25, 8, (226, 168, 88, 255), outline=(150, 95, 40, 255), ow=2)
    ell(d, 48, 64, 24, 7, (242, 190, 110, 255))
    # котлета
    ell(d, 48, 60, 27, 6.5, (122, 70, 40, 255), outline=(80, 45, 25, 255), ow=1.8)
    ell(d, 48, 58.5, 26, 5.5, (146, 88, 52, 255))
    # сыр (квадрат с потёками)
    poly(d, [(23, 56), (48, 51), (73, 56), (66, 60), (50, 62), (44, 61), (30, 59)],
         (250, 200, 60, 255), outline=(200, 150, 35, 255), ow=1.4)
    for x, y in [(34, 60), (58, 60.5)]:
        ell(d, x, y, 2, 2.6, (250, 200, 60, 255))
    # томат
    ell(d, 48, 50, 24, 4.5, (222, 84, 62, 255), outline=(150, 45, 30, 255), ow=1.4)
    # салат (волнистый край)
    ell(d, 48, 47, 27, 5, (132, 192, 92, 255), outline=(80, 135, 55, 255), ow=1.6)
    for x in range(24, 76, 7):
        ell(d, x, 50, 3.4, 2.6, (132, 192, 92, 255))
    # верхняя булка (купол)
    d.pieslice([E(22), E(22), E(74), E(50)], 180, 360,
               fill=(235, 176, 96, 255), outline=(150, 95, 40, 255), width=int(E(2.2)))
    d.pieslice([E(25), E(24), E(71), E(46)], 180, 360, fill=(246, 196, 120, 255))
    # кунжут
    for x, y, a in [(38, 30, -20), (50, 27, 10), (60, 32, 30), (45, 34, -40), (56, 26, -15)]:
        rot_ellipse(img, x, y, 2.2, 1.2, a, (255, 240, 210, 255))
    return img

# ============ ТОРТ (кусочек) ============
def cake():
    img = canvas()
    d = ImageDraw.Draw(img)
    # тень
    ell(d, 48, 76, 30, 6, (0, 0, 0, 55))
    # тарелка
    ell(d, 48, 66, 31, 10, (245, 240, 230, 255), outline=(120, 100, 85, 255), ow=2)
    ell(d, 48, 65, 24, 7, (228, 222, 208, 255))
    ell(d, 48, 64.5, 23, 6.5, (245, 240, 230, 255))
    # кусок: боковая грань (бисквит + прослойки)
    poly(d, [(26, 42), (64, 48), (64, 66), (26, 60)], (250, 190, 200, 255),
         outline=(178, 98, 110, 255), ow=2)
    # кремовые прослойки
    poly(d, [(26, 48), (64, 54), (64, 57), (26, 51)], (255, 244, 244, 255))
    poly(d, [(26, 56), (64, 62), (64, 64), (26, 58)], (255, 244, 244, 255))
    # верхняя глазурь
    poly(d, [(26, 42), (64, 48), (64, 53), (26, 47)], (255, 236, 240, 255),
         outline=(226, 150, 165, 255), ow=1.4)
    # потёки глазури
    for x, y in [(32, 48), (44, 50), (56, 51.5)]:
        ell(d, x, y, 2, 2.8, (255, 236, 240, 255))
    # вишенка
    ell(d, 40, 36, 4.2, 4, (210, 45, 55, 255), outline=(140, 25, 35, 255), ow=1.6)
    ell(d, 38.6, 34.6, 1.4, 1.2, (255, 160, 160, 255))
    line(d, 40, 32, 43, 27, (110, 70, 40, 255), w=1.2)
    # посыпка
    for x, y, c in [(34, 44, (120, 200, 120, 255)), (48, 46, (255, 220, 100, 255)), (58, 49, (140, 170, 240, 255))]:
        ell(d, x, y, 1, 0.8, c)
    return img

save(pizza(), 'dish_pizza')
save(steak(), 'dish_steak')
save(sushi(), 'dish_sushi')
save(burger(), 'dish_burger')
save(cake(), 'dish_cake')
