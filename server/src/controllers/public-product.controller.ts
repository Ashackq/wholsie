import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ProductCategory } from "../models/ProductCategory.js";

/**
 * Get all products with filters and pagination (public)
 */
export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const {
      limit = 12,
      offset = 0,
      categoryId,
      category,
      search,
      sort = "newest",
    } = req.query;

    // console.log("getProducts called with query:", req.query);

    const filter: any = { status: "active" };
    const andConditions = [];

    // Determine target category ID (from ID param OR slug param)
    let targetCategoryId: string | null = null;
    let categoryName = "";

    if (categoryId) {
      // If ID is provided, verify it and get name
      if (mongoose.isValidObjectId(categoryId)) {
        const foundCategory = await ProductCategory.findById(categoryId);
        if (foundCategory) {
          targetCategoryId = foundCategory._id.toString();
          categoryName = foundCategory.name;
        }
      } else {
        targetCategoryId = categoryId as string;
        // Fallback if ID is string based but invalid ObjectId (unlikely if strictly mongo)
      }
    } else if (category && typeof category === "string") {
      // Logic to find category ID by slug
      const foundCategory = await ProductCategory.findOne({ slug: category });
      if (foundCategory) {
        targetCategoryId = foundCategory._id.toString();
        categoryName = foundCategory.name;
      } else {
        console.log(`Category slug '${category}' not found`);
      }
    }

    // Filter by category OR include Combo products (cross-category visibility)
    if (targetCategoryId) {
      // console.log(`Filtering for Category: ${categoryName} (${targetCategoryId}) + Combos`);

      // Ensure proper ObjectId casting for strict equality checks in $or
      const catIdFilter = mongoose.isValidObjectId(targetCategoryId)
        ? { categoryId: new mongoose.Types.ObjectId(targetCategoryId) }
        : { categoryId: targetCategoryId };

      // Special logic for "Puffs" categories:
      // The user specified that ALL Puff combos are categorized under "Oats Puffs".
      // So if we are viewing ANY Puff category (Jowar, Protein, etc.), we must also include combos from "Oats Puffs".
      const isPuffCategory = /puff/i.test(categoryName || "");

      let comboFilter = null;
      if (isPuffCategory) {
        // We need the ID for "Oats Puffs"
        // Ideally we should cache this or fetch it. Since we are in the request loop, we fetch it.
        const oatsCategory = await ProductCategory.findOne({
          slug: "oats-puffs",
        });
        if (oatsCategory) {
          comboFilter = { categoryId: oatsCategory._id, isCombo: true };
        }
      }

      const orClauses: any[] = [catIdFilter];
      if (comboFilter) {
        orClauses.push(comboFilter);
      }

      andConditions.push({
        $or: orClauses,
      });
    }

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search as string, $options: "i" } },
          { description: { $regex: search as string, $options: "i" } },
        ],
      });
    }

    // Apply AND conditions if any exist
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const sortObj: any = {};
    switch (sort) {
      case "price-asc":
        sortObj.price = 1;
        break;
      case "price-desc":
        sortObj.price = -1;
        break;
      case "rating":
        sortObj.rating = -1;
        break;
      default:
        sortObj.createdAt = -1;
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name slug")
      .sort(sortObj)
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
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product by slug (public)
 */
export async function getProductBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      slug: slug.toLowerCase(),
    }).populate("categoryId", "name slug");

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
 * Get product by ID (public)
 */
export async function getProductById(
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
 * Search products (public)
 */
export async function searchProducts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query required" });
    }

    const products = await Product.find({
      status: "active",
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    })
      .populate("categoryId", "name slug")
      .limit(parseInt(limit as string))
      .select("name slug image price salePrice discount");

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}
