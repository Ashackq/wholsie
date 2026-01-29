import { Request, Response, NextFunction } from "express";
import { ProductCategory } from "../models/ProductCategory.js";
import { Product } from "../models/Product.js";

/**
 * Get all categories (public)
 */
export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await ProductCategory.find({ status: "active" }).sort({
      position: 1,
      name: 1,
    });

    // Add product counts
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        // Count products in this category (strict)
        const baseCount = await Product.countDocuments({
          categoryId: category._id,
          status: "active",
        });

        // Get count of combo products (that are active)
        const comboCount = await Product.countDocuments({
          isCombo: true,
          status: "active",
        });

        // For categories that display combos in the frontend logic (e.g. puff categories)
        // we should technically include them in the count.
        // However, simply adding comboCount to every category would be misleading in some contexts.
        // But since the frontend cross-lists combos on ALL category pages,
        // the displayed count should reflect the total items viewable on that page.

        // If we follow the same logic as getProducts:
        // Count = (Products strictly in this category) + (Combo Products RELEVANT to this category)

        // Special logic for "Puffs" categories:
        // All Puff combos are in "Oats Puffs". Include them if current category is a "Puff" category.
        const isPuffCategory = /puff/i.test(category.name || "");
        let comboFilter = null;

        if (isPuffCategory) {
          // We need oats-puffs ID. Since we are inside a map loop, fetching it every time is inefficient.
          // However, for correctness let's fetch it.
          // Better optimization would be fetching it once outside the loop, but let's stick to safe logic first.
          const oatsCategory = await ProductCategory.findOne({
            slug: "oats-puffs",
          });
          if (oatsCategory) {
            comboFilter = { categoryId: oatsCategory._id, isCombo: true };
          }
        }

        const orClauses: any[] = [{ categoryId: category._id }];
        if (comboFilter) {
          orClauses.push(comboFilter);
        }

        const totalVisibleCount = await Product.countDocuments({
          $and: [
            { status: "active" },
            {
              $or: orClauses,
            },
          ],
        });

        return {
          ...category.toObject(),
          productCount: totalVisibleCount,
        };
      }),
    );

    res.json({
      success: true,
      data: categoriesWithCounts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get category by slug (public)
 */
export async function getCategoryBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { slug } = req.params;

    const category = await ProductCategory.findOne({
      slug: slug.toLowerCase(),
      status: "active",
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const productCount = await Product.countDocuments({
      categoryId: category._id,
      status: "active",
    });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get products by category (public)
 */
export async function getProductsByCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { categoryId } = req.params;
    const { limit = 12, offset = 0, sort = "newest" } = req.query;

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

    const products = await Product.find({
      categoryId,
      status: "active",
    })
      .sort(sortObj)
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string));

    const total = await Product.countDocuments({
      categoryId,
      status: "active",
    });

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
