import axios from "axios"
import * as cheerio from 'cheerio'
import { extractCurrency, extractDescription, extractPrice } from "../utils"

export async function scrapeAmazonProduct(productUrl: string) {
  if (!productUrl) {
    return
  }

  // BrightData Proxy config
  const brightDataConfig = {
    username: String(process.env.BRIGHT_DATA_USERNAME),
    password: String(process.env.BRIGHT_DATA_PASSWORD),
    port: 22225,
    sessionId: Math.floor(1000000 * Math.random()),
  }

  const options = {
    auth: {
      username: `${brightDataConfig.username}-session-${brightDataConfig.sessionId}`,
      password: brightDataConfig.password
    },
    host: 'brd.superproxy.io',
    port: brightDataConfig.port,
    rejectUnauthorized: false
  }

  try {
    const response = await axios.get(productUrl, options)
    const $ = cheerio.load(response.data)
    
    const title = $('#productTitle').text().trim()

    const currentPrice = extractPrice(
      $('.priceToPay span.a-price-whole'),
      $('a.size.base.a-color-price'),
      $('.a-button-selected .a-color-base')
    )

    const originalPrice = extractPrice(
      $('#priceblock_ourprice'),
      $('.a-price.a-text-price span.a-offscreen'),
      $('#listPrice'),
      $('#priceblock_dealprice'),
      $('.a-size-base.a-color-price')
    )

    const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable'

    const images = $('#imgBlkFront').attr('data-a-dynamic-image') ||
    $('#landingImage').attr('data-a-dynamic-image') || '{}'

    const imageUrls = Object.keys(JSON.parse(images))

    const currency = extractCurrency($('.a-price-symbol'))
    
    const discountRate = $('.savingsPercentage').text().replace(/[-%]/g, "")

    const description = extractDescription($)

    const data = {
      url: productUrl,
      currency: currency || '₹',
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      isOutOfStock: outOfStock,
      category: 'category',
      reviewsCount: 100,
      stars: 4.5,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(originalPrice)
    }
    return data
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`)
  }

}