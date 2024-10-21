gsap.registerPlugin(ScrollTrigger);

gsap.from("#container-3 .main-title", {
    opacity: 0,
    y: 100,
    duration: 2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#container-3 .main-title",
        start: "top 90%",
        end: "bottom 60%",
        scrub: 2,
        // marker:true
    }
});


gsap.from("#container-3 .content", {
    duration: 2,
    opacity: 0,
    y: 60,
    stagger: 0.2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#container-3 .content",
        start: "top 70%",
        end: "bottom 70%",
        scrub: 2,
        // markers: true      
    }
});

gsap.from(".container-4 .main-title", {
    opacity: 0,
    y: 100,
    duration: 2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: ".container-4 .main-title",
        start: "top 90%",
        end: "bottom 60%",
        scrub: 2,
    }
});


var anim = gsap.timeline({
    scrollTrigger: {
        trigger: ".main-2",
        scroller: document.body,
        start: "top 80%",
        end: "top 30%",
        scrub: 2,
        // markers : true
    }
});

anim.from(".elements.ele-1.left", {
    opacity: 0,
    x: -300,
    duration: 2
})
    .from(".elements.ele-1.right", {
        opacity: 0,
        x: 300,
        duration: 2
    })
    .from(".elements.ele-2.left", {
        opacity: 0,
        x: -300,
        duration: 2
    })
    .from(".elements.ele-2.right", {
        opacity: 0,
        x: 300,
        duration: 2
    });