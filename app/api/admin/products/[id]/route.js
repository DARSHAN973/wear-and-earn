import { NextResponse as res } from "next/server";
import prisma from "@/lib/prisma";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary-utils";

// GET method for admin to fetch any product for editing
export const GET = async (request, { params }) => {
    const { id } = await params;

    try {
        const product = await prisma.product.findFirst({
            where: {
                id: Number(id)
                // No status filtering - admin can edit any product
            },
            include: {
                category: true,
                images: true,
            },
        });

        if (!product) {
            return res.json({ 
                success: false, 
                message: "Product not found", 
                product: null 
            }, { status: 404 });
        }

        return res.json({ 
            success: true, 
            message: "Product fetched successfully", 
            product: product 
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching product for admin:', error);
        return res.json(
            { success: false, error: 'Failed to fetch product' },
            { status: 500 }
        );
    }
};

export const PATCH = async (request, { params }) => {

    const { id } = await params;

    try {
        const existingProduct = await prisma.product.findUnique({
            where: { id: Number(id) },
            select: { isActive: true }
        });

        if (!existingProduct) {
            return res.json({ error: 'Product not found' }, { status: 404 });
        }

        const updatedProduct = await prisma.product.update({
            where: { id: Number(id) },
            data: {
                isActive: !existingProduct.isActive
            }
        });

        return res.json({ sucess: true, message: "Product data fetched", response: updatedProduct }, { status: 200 });
    } catch (error) {
        console.error('Error toggling product status:', error);
        return res.json(
            { error: 'Failed to toggle product status' },
            { status: 500 }
        );
    }
}



export const DELETE = async (request, { params }) => {
    const { id } = await params;

    try {
        const productId = Number(id);

        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!existingProduct) {
            return res.json({ error: 'Product not found' }, { status: 404 });
        }

        // Delete related product images first
        await prisma.productImage.deleteMany({
            where: { productId }
        });

        // Now delete the product
        await prisma.product.delete({
            where: { id: productId }
        });

        return res.json({ message: 'Product deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.json(
            { error: 'Failed to delete product' },
            { status: 500 }
        );
    }
};


async function uploadFileToCloudinary(file) {
    try {
        console.log('Starting Cloudinary upload...');
        
        // Check if Cloudinary is properly configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error('Cloudinary environment variables not configured');
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        console.log('File buffer created, size:', buffer.length);
        
        const result = await uploadImageToCloudinary(buffer, {
            folder: 'wear-and-earn/products',
            public_id: `product-${Date.now()}-${Math.random().toString(36).substring(7)}`
        });
        
        console.log('Cloudinary upload successful:', result.url);
        return result.url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
}


export async function PUT(request, { params }) {

    console.log("called")

    try {
        const parameter = await params;
        const productId = parseInt(parameter.id);
        if (Number.isNaN(productId)) {
            return Response.json({ success: false, message: "Invalid product id" }, { status: 400 });
        }

        const formData = await request.formData();
        const data = {};
        for (const [key, value] of formData.entries()) {
            // Check if value is a file by checking if it has file-like properties
            if (typeof value === 'object' && value !== null && 'name' in value && 'size' in value && 'type' in value) {
                console.log(`Skipping file field: ${key}, file name: ${value.name}, size: ${value.size}`);
                continue; // skip files here
            }
            data[key] = value;
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id: Number(productId) },
            include: { images: true },
        });
        if (!existingProduct) {
            return Response.json({ success: false, message: "Product not found" }, { status: 404 });
        }

        // Thumbnail logic (unchanged)...

        const hasProductImagesField = formData.has("productImages");
        const rawImages = hasProductImagesField ? formData.getAll("productImages") : null;

        const incomingImageUrls = [];
        if (rawImages) {
            for (const item of rawImages) {
                // Check if item is a file by checking file-like properties
                if (typeof item === 'object' && item !== null && 'name' in item && 'size' in item && 'type' in item && item.name) {
                    const url = await uploadFileToCloudinary(item);
                    incomingImageUrls.push(url);
                } else if (typeof item === "string") {
                    const trimmed = item.trim();
                    if (trimmed && trimmed !== "[object Object]") {
                        try {
                            const parsed = JSON.parse(trimmed);
                            if (parsed?.imageUrl) incomingImageUrls.push(parsed.imageUrl);
                            else incomingImageUrls.push(trimmed);
                        } catch {
                            incomingImageUrls.push(trimmed);
                        }
                    }
                }
            }
        }

        const finalIncomingUrls = Array.from(new Set(incomingImageUrls.filter(Boolean)));

        // Handle thumbnail upload
        let thumbnailImageUrl = existingProduct.mainImage; // Keep existing if no new one
        const thumbnailFile = formData.get("thumbnailImage");
        if (thumbnailFile && typeof thumbnailFile === 'object' && thumbnailFile !== null && 'name' in thumbnailFile && 'size' in thumbnailFile && 'type' in thumbnailFile && thumbnailFile.name) {
            thumbnailImageUrl = await uploadFileToCloudinary(thumbnailFile);
        }

        // Map form data to update object
        const updateData = {
            title: data.title || existingProduct.title,
            description: data.description || existingProduct.description,
            longDescription: data.overview || existingProduct.longDescription,
            productPrice: parseFloat(data.productPrice) || existingProduct.productPrice,
            mlmPrice: parseFloat(data.mlmPrice) || existingProduct.mlmPrice,
            gst: parseFloat(data.gst) || existingProduct.gst,
            homeDelivery: parseFloat(data.shipping) || existingProduct.homeDelivery,
            discount: parseFloat(data.discount) || existingProduct.discount,
            keyFeature: data.keyFeatures || existingProduct.keyFeature,
            type: data.productType || existingProduct.type,
            mainImage: thumbnailImageUrl,
        };

        // Handle category update
        if (data.category) {
            const category = await prisma.category.findFirst({
                where: { name: data.category }
            });
            if (category) {
                updateData.categoryId = category.id;
            }
        }

        if (rawImages !== null) {
            const existingUrls = existingProduct.images.map(img => img.imageUrl);
            const toDelete = existingUrls.filter(u => !finalIncomingUrls.includes(u));
            const toCreate = finalIncomingUrls.filter(u => !existingUrls.includes(u));
            const imagesOps = {};

            if (toDelete.length > 0) {
                imagesOps.deleteMany = { imageUrl: { in: toDelete } };
                // Additional unlink logic...
            } else if (finalIncomingUrls.length === 0 && existingUrls.length > 0) {
                imagesOps.deleteMany = {};
            }

            if (toCreate.length > 0) {
                imagesOps.create = toCreate.map(u => ({ imageUrl: u }));
            }

            if (Object.keys(imagesOps).length > 0) {
                updateData.images = imagesOps;
            }
        }

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updateData,
            include: { images: true, category: true },
        });

        return Response.json({ success: true, product: updatedProduct }, { status: 200 });
    } catch (error) {
        console.error('Product update error:', error);
        return Response.json({ 
            success: false, 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}


