# Devi's Fashion website

Website for **Devi's Fashion**, a women's clothes shop in Flacq, Mauritius.
Plain static pages: no build step, no server code.

| Page | What it's for |
| --- | --- |
| `index.html` | The shop: latest-arrivals carousel, all dresses, tap-to-zoom photos |
| `admin.html` | Photo manager: add, delete, reorder, caption, price and set sizes for each dress, then **Publish** |

## How photos are stored

- `gallery.js` lists the photos in carousel order, with caption, price and available sizes.
- `images/size-chart.jpg` is the size chart customers open from the shop.
- `images/` holds the photos.
- The admin page edits both and saves them to this repository through GitHub, using a fine-grained access key that is kept only on the device that uses it.

## Ordering

Customers pick a size and quantity in the dress view and tap **Order on WhatsApp**.
A WhatsApp chat opens with the order already typed in. The number is set in the admin page under **Orders**
(stored in `gallery.js` as `DEVIS_SETTINGS`). If it's left empty, the button falls back to Facebook Messenger.
Dresses with no sizes ticked can be ordered in any size from XS to 6XL.

## Setting up publishing (once per phone or computer)

1. Sign in to github.com in a browser (not the GitHub app).
2. Open the access key link on the admin page. Name, expiry and permission are pre-filled.
3. Under **Repository access**, choose **Only select repositories** and pick **devis-fashion**.
4. Tap **Generate token**, copy it, paste it into the admin page and tap **Connect**.

## Hosting

Any static host works. Connecting this repository to Netlify or Cloudflare Pages
means every **Publish** goes live automatically within a minute or two.
