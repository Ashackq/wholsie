import { Request, Response, NextFunction } from "express";
import { Product } from "../models/Product.js";

/**
 * Get all products (admin)
 */
export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { limit = 20, offset = 0, search, categoryId } = req.query;

    const filter: any = { status: { $ne: "deleted" } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string));

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single product (admin)
 */
export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).populate(
      "categoryId",
      "name slug",
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create product (admin)
 */
export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const {
      name,
      description,
      price,
      salePrice,
      discountPrice,
      stock,
      categoryId,
      images,
      variants,
      status,
      isRecentLaunch,
      isCombo,
      image,
      weight,
      ingredients,
    } = req.body;

    // Generate slug
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Calculate discount
    const finalSalePrice = salePrice || discountPrice || price;
    const discount =
      finalSalePrice < price
        ? Math.round(((price - finalSalePrice) / price) * 100)
        : 0;

    const parsedWeightRaw = weight !== undefined && weight !== null && weight !== "" ? Number(weight) : undefined;
    const parsedWeight = Number.isFinite(parsedWeightRaw) ? parsedWeightRaw : undefined;

    const product = new Product({
      name: name.trim(),
      title: name.trim(),
      description,
      price,
      salePrice: finalSalePrice,
      discountedPrice: finalSalePrice,
      discountPrice: finalSalePrice,
      discount,
      stock: stock || 0,
      quantity: stock || 0,
      categoryId,
      images: images || [],
      image: image || "",
      variants: variants || [],
      slug,
      status: status || "active",
      isRecentLaunch: isRecentLaunch || false,
      isCombo: isCombo || false,
      weight: parsedWeight,
      ingredients: ingredients || undefined,
      rating: 0,
      reviewCount: 0,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update product (admin)
 */
export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { productId } = req.params;
    const updateData: any = { updatedAt: new Date() };
    console.log(req.body);

    const {
      name,
      description,
      price,
      salePrice,
      discountPrice,
      stock,
      categoryId,
      images,
      variants,
      status,
      isRecentLaunch,
      isCombo,
      image,
      weight,
      ingredients,
    } = req.body;

    if (name) {
      updateData.name = name.trim();
      updateData.title = name.trim();
      updateData.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    if (description !== undefined) updateData.description = description;
    if (stock !== undefined) {
      updateData.stock = stock;
      updateData.quantity = stock;
    }
    if (categoryId) updateData.categoryId = categoryId;
    if (images) {
      updateData.images = images;
    }
    if (image !== undefined) updateData.image = image;
    if (variants) updateData.variants = variants;
    if (status) updateData.status = status;
    if (isRecentLaunch !== undefined)
      updateData.isRecentLaunch = isRecentLaunch;
    if (isCombo !== undefined) updateData.isCombo = isCombo;
    if (weight !== undefined) {
      const parsed = weight === "" ? undefined : Number(weight);
      updateData.weight = Number.isFinite(parsed) ? parsed : undefined;
    }
    if (ingredients !== undefined) {
      updateData.ingredients = ingredients;
    }

    if (price !== undefined) {
      updateData.price = price;
      const finalSalePrice = salePrice || discountPrice || price;
      updateData.salePrice = finalSalePrice;
      updateData.discountedPrice = finalSalePrice;
      updateData.discountPrice = finalSalePrice;
      updateData.discount =
        finalSalePrice < price
          ? Math.round(((price - finalSalePrice) / price) * 100)
          : 0;
    }

    const product = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    }).populate("categoryId", "name slug");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product updated",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { productId } = req.params;

    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "deleted", updatedAt: new Date() },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    next(error);
  }
}
