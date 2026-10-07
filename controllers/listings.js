const Listing =require("../models/listing");

const getUploadedImage = (file) => {
    if (!file) return null;
    const url = file.secure_url || file.url || file.path;
    const filename = file.public_id || file.filename;
    if (!url || !filename) {
        throw new Error("Cloudinary did not return an image URL and public ID");
    }
    return { url, filename };
};

module.exports.index = async (req, res) =>{
  const  allListings= await Listing.find({});
     res.render("listings/index.ejs", {allListings});
    };

    module.exports.renderNewForm = (req, res) => { 
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
      let {id} = req.params;
      const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
            path: "author",
        },
      })
      .populate("owner");
      if(!listing) {
    req.flash("error", "listing you requested for does not exist!");
    return res.redirect("/listings");
}
console.log(listing);
res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    const image = getUploadedImage(req.file);
    if (!image) {
        req.flash("error", "Please select an image for the listing.");
        return res.redirect("/listings/new");
    }
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = image;
    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
     const listing = await Listing.findById(id);
     if(!listing) {
    req.flash("error", "listing you requested for does not exist!");
    return res.redirect("/listings");
}
const originalImageUrl = listing.image?.url || null;
res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
     const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }
    Object.assign(listing, req.body.listing);
    const image = getUploadedImage(req.file);
    if (image) listing.image = image;
    await listing.save();
     req.flash("success", "Listing Updated!");
     res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deleteListing = await Listing.findByIdAndDelete(id);
    console.log(deleteListing);
    req.flash("success", "Listing deleted!");
    res.redirect("/listings");
};
